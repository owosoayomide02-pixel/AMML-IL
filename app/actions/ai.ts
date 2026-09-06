"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { answerFromInventory } from "@/lib/ai/assistant";
import { buildOperationsBrief } from "@/lib/ai/briefing";
import { completeChat, completeJson, completeText, isAiConfigured, type ChatTurn } from "@/lib/ai/client";
import { analyzePrice, buildDemandForecast, buildReorderAdvice } from "@/lib/ai/rules";
import { syncStockAlerts } from "@/lib/alerts";
import { fetchLiveUsdNgnRate } from "@/lib/fx";
import { formatNgnUsd } from "@/lib/money";
import { notifyTelegram } from "@/lib/telegram";
import { getErrorMessage, logError } from "@/lib/errors";
import { getUsdNgnRate, listInventory, listPriceHistory } from "@/lib/queries";
import { requireBusiness, requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function getPriceInsightsAction(productId: string) {
  const session = await requirePermission("products.read");
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, cost_price, selling_price")
    .eq("id", productId)
    .eq("business_id", session.businessId)
    .maybeSingle();
  if (!product) return fail("Product not found.");
  const history = await listPriceHistory(session.businessId, productId);
  const analysis = analyzePrice(product.cost_price, product.selling_price, history);
  let commentary: string | null = null;
  if (isAiConfigured()) {
    try {
      commentary = await completeText(
        "You are an inventory pricing analyst. Be concise. Do not invent SKUs. Never change prices yourself.",
        `Product ${product.name} (${product.sku}). Cost ${analysis.costPrice}, selling ${analysis.sellingPrice}, margin ${(analysis.margin * 100).toFixed(1)}%, suggested ${analysis.suggested}. Flags: ${analysis.flags.join(" ") || "none"}. Write 2 short sentences.`,
      );
    } catch (error) {
      logError("price-insights", error);
    }
  }
  return ok({ ...analysis, commentary, configured: isAiConfigured() });
}

export async function getReorderAdviceAction() {
  const session = await requirePermission("inventory.read");
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const [inventory, saleItems] = await Promise.all([
    listInventory(session.businessId),
    supabase
      .from("sale_items")
      .select("product_id, quantity, sales!inner(business_id, status, sale_date)")
      .eq("sales.business_id", session.businessId)
      .neq("sales.status", "cancelled")
      .gte("sales.sale_date", since.toISOString().slice(0, 10)),
  ]);

  const sold = new Map<string, number>();
  for (const item of saleItems.data ?? []) {
    sold.set(item.product_id, (sold.get(item.product_id) ?? 0) + toNumber(item.quantity));
  }

  const byProduct = new Map<
    string,
    { productId: string; name: string; sku: string; available: number; minimum: number; reorderQty: number; sold30: number }
  >();
  for (const row of inventory) {
    if (!row.products) continue;
    const current = byProduct.get(row.product_id) ?? {
      productId: row.product_id,
      name: row.products.name,
      sku: row.products.sku,
      available: 0,
      minimum: toNumber(row.products.minimum_stock_level),
      reorderQty: toNumber(row.products.reorder_quantity),
      sold30: sold.get(row.product_id) ?? 0,
    };
    current.available += toNumber(row.quantity_available);
    byProduct.set(row.product_id, current);
  }

  const advice = buildReorderAdvice([...byProduct.values()]);
  let commentary: string | null = null;
  if (isAiConfigured() && advice.length > 0) {
    try {
      commentary = await completeText(
        "You are an inventory planner. Recommend restock priorities in 2 sentences. Use only provided SKUs.",
        JSON.stringify(advice.slice(0, 8)),
      );
    } catch (error) {
      logError("reorder-advice", error);
    }
  }
  return ok({ items: advice, commentary, configured: isAiConfigured() });
}

export async function getDemandForecastAction() {
  const session = await requirePermission("reports.read");
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 28);
  const { data } = await supabase
    .from("sale_items")
    .select("quantity, total, sales!inner(business_id, status, sale_date)")
    .eq("sales.business_id", session.businessId)
    .neq("sales.status", "cancelled")
    .gte("sales.sale_date", since.toISOString().slice(0, 10));

  const days = new Map<string, { date: string; qty: number; revenue: number }>();
  for (let i = 27; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days.set(key, { date: key, qty: 0, revenue: 0 });
  }
  for (const item of data ?? []) {
    const sale = item.sales as { sale_date?: string } | null;
    const key = String(sale?.sale_date ?? "").slice(0, 10);
    const bucket = days.get(key);
    if (!bucket) continue;
    bucket.qty += toNumber(item.quantity);
    bucket.revenue += toNumber(item.total);
  }
  const forecast = buildDemandForecast([...days.values()]);
  let commentary: string | null = null;
  if (isAiConfigured()) {
    try {
      commentary = await completeText(
        "You are a demand analyst. Explain the 2-week outlook in 2 sentences using only the numbers given.",
        JSON.stringify(forecast),
      );
    } catch (error) {
      logError("demand-forecast", error);
    }
  }
  return ok({ ...forecast, commentary, configured: isAiConfigured() });
}

export async function scanAnomaliesAction(): Promise<ActionResult<{ created: number }>> {
  try {
    const session = await requirePermission("alerts.write");
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [transactions, history, inventory] = await Promise.all([
      supabase
        .from("stock_transactions")
        .select("id, product_id, quantity, transaction_type, reason, created_at, products(name, sku)")
        .eq("business_id", session.businessId)
        .gte("created_at", since.toISOString())
        .in("transaction_type", ["adjustment_out", "damaged", "expired", "stock_out"]),
      supabase
        .from("product_price_history")
        .select("product_id, cost_price, selling_price, created_at, products(name, sku)")
        .eq("business_id", session.businessId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      listInventory(session.businessId),
    ]);

    const findings: Array<{ type: string; title: string; message: string; severity: "info" | "warning" | "critical"; productId?: string }> = [];

    for (const row of inventory) {
      if (toNumber(row.quantity_available) <= 0 && row.products) {
        findings.push({
          type: "out_of_stock",
          title: `${row.products.name} is out of stock`,
          message: `${row.products.sku} has no available quantity in ${row.warehouses?.name ?? "a warehouse"}.`,
          severity: "critical",
          productId: row.product_id,
        });
      }
    }

    for (const tx of transactions.data ?? []) {
      if (toNumber(tx.quantity) >= 20) {
        const product = tx.products as { name?: string; sku?: string } | null;
        findings.push({
          type: "large_adjustment",
          title: `Large ${tx.transaction_type.replace(/_/g, " ")}`,
          message: `${product?.name ?? "A product"} moved ${tx.quantity} units${tx.reason ? ` (${tx.reason})` : ""}.`,
          severity: "warning",
          productId: tx.product_id,
        });
      }
    }

    const latestByProduct = new Map<string, { selling: number; cost: number; name: string }>();
    for (const row of history.data ?? []) {
      if (latestByProduct.has(row.product_id)) continue;
      const product = row.products as { name?: string } | null;
      latestByProduct.set(row.product_id, {
        selling: toNumber(row.selling_price),
        cost: toNumber(row.cost_price),
        name: product?.name ?? "Product",
      });
    }
    const previousByProduct = new Map<string, { selling: number; cost: number }>();
    for (const row of history.data ?? []) {
      if (!latestByProduct.has(row.product_id) || previousByProduct.has(row.product_id)) continue;
      const latest = latestByProduct.get(row.product_id);
      if (!latest) continue;
      if (toNumber(row.selling_price) === latest.selling && toNumber(row.cost_price) === latest.cost) continue;
      previousByProduct.set(row.product_id, { selling: toNumber(row.selling_price), cost: toNumber(row.cost_price) });
    }
    const usdNgnRate = await getUsdNgnRate(session.businessId);
    for (const [productId, latest] of latestByProduct) {
      const previous = previousByProduct.get(productId);
      if (!previous) continue;
      const sellChanged = latest.selling !== previous.selling;
      const costChanged = latest.cost !== previous.cost;
      if (!sellChanged && !costChanged) continue;
      const rose = latest.selling > previous.selling || latest.cost > previous.cost;
      const parts = [
        sellChanged
          ? `Selling ${latest.selling > previous.selling ? "increased" : "decreased"} from ${formatNgnUsd(previous.selling, usdNgnRate)} to ${formatNgnUsd(latest.selling, usdNgnRate)}`
          : null,
        costChanged
          ? `Cost ${latest.cost > previous.cost ? "increased" : "decreased"} from ${formatNgnUsd(previous.cost, usdNgnRate)} to ${formatNgnUsd(latest.cost, usdNgnRate)}`
          : null,
      ].filter(Boolean);
      findings.push({
        type: rose ? "price_increase" : "price_decrease",
        title: `${rose ? "Price increase" : "Price decrease"} on ${latest.name}`,
        message: `${parts.join(". ")}. Company rate 1 USD = ₦${usdNgnRate}.`,
        severity: rose ? "warning" : "info",
        productId,
      });
    }

    if (isAiConfigured() && findings.length > 0) {
      try {
        const extra = await completeJson<{ extras?: Array<{ title: string; message: string; severity: "info" | "warning" | "critical" }> }>(
          "Return JSON { extras: [{ title, message, severity }] }. Only mention items from the input. Max 3 extras.",
          JSON.stringify(findings.slice(0, 15)),
        );
        for (const item of extra?.extras ?? []) {
          findings.push({ type: "ai_anomaly", title: item.title, message: item.message, severity: item.severity });
        }
      } catch (error) {
        logError("anomaly-ai", error);
      }
    }

    let created = 0;
    for (const finding of findings.slice(0, 20)) {
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("business_id", session.businessId)
        .eq("title", finding.title)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (existing) continue;
      const { error } = await supabase.from("alerts").insert({
        business_id: session.businessId,
        type: finding.type,
        title: finding.title,
        message: finding.message,
        severity: finding.severity,
        related_product_id: finding.productId ?? null,
      });
      if (!error) {
        created += 1;
        await notifyTelegram(session.businessId, `AAML ${finding.title}\n${finding.message}`);
      }
    }

    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return ok({ created });
  } catch (error) {
    logError("scan-anomalies", error);
    return fail(getErrorMessage(error, "Unable to scan for anomalies."));
  }
}

export async function getAskAiMetaAction() {
  try {
    const session = await requireBusiness();
    const [companyUsdNgnRate, liveUsdNgnRate] = await Promise.all([getUsdNgnRate(session.businessId), fetchLiveUsdNgnRate()]);
    return ok({
      configured: isAiConfigured(),
      currency: session.business.currency,
      companyUsdNgnRate,
      liveUsdNgnRate,
    });
  } catch (error) {
    logError("ask-ai-meta", error);
    return fail(getErrorMessage(error, "Unable to open Ask AI."));
  }
}

export async function askAiAction(
  question: string,
  history: ChatTurn[] = [],
): Promise<ActionResult<string>> {
  try {
    const session = await requireBusiness();
    const q = question.trim();
    if (q.length < 2) return fail("Type a question about the business — stock, sales, prices, or the dollar rate.");

    const supabase = await createClient();
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const sinceDay = since.toISOString().slice(0, 10);
    const [products, inventory, sales, saleItems, purchases, alerts, historyRows, companyUsdNgnRate, liveUsdNgnRate] = await Promise.all([
      supabase.from("products").select("id, name, sku, cost_price, selling_price, minimum_stock_level, status").eq("business_id", session.businessId).eq("status", "active").limit(150),
      listInventory(session.businessId),
      supabase
        .from("sales")
        .select("invoice_number, total, status, sale_date, payment_status, balance, customers(name)")
        .eq("business_id", session.businessId)
        .gte("sale_date", sinceDay)
        .order("sale_date", { ascending: false })
        .limit(400),
      supabase
        .from("sale_items")
        .select("product_id, quantity, total, products(name, sku), sales!inner(business_id, status, sale_date)")
        .eq("sales.business_id", session.businessId)
        .gte("sales.sale_date", sinceDay),
      supabase
        .from("purchases")
        .select("total, status, purchase_date")
        .eq("business_id", session.businessId)
        .gte("purchase_date", sinceDay)
        .limit(200),
      supabase.from("alerts").select("title, severity, is_read").eq("business_id", session.businessId).eq("is_read", false).limit(12),
      supabase
        .from("product_price_history")
        .select("product_id, cost_price, selling_price, created_at, products(name, sku)")
        .eq("business_id", session.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
      getUsdNgnRate(session.businessId),
      fetchLiveUsdNgnRate(),
    ]);

    const latest = new Map<string, { cost: number; sell: number; name: string; sku: string }>();
    const previous = new Map<string, { cost: number; sell: number }>();
    for (const row of historyRows.data ?? []) {
      const product = row.products as { name?: string; sku?: string } | null;
      if (!latest.has(row.product_id)) {
        latest.set(row.product_id, {
          cost: toNumber(row.cost_price),
          sell: toNumber(row.selling_price),
          name: product?.name ?? "Product",
          sku: product?.sku ?? "",
        });
        continue;
      }
      if (!previous.has(row.product_id)) {
        previous.set(row.product_id, { cost: toNumber(row.cost_price), sell: toNumber(row.selling_price) });
      }
    }
    const recentPriceChanges: Array<{ name: string; sku: string; field: string; direction: string; from: number; to: number }> = [];
    for (const [productId, next] of latest) {
      const prior = previous.get(productId);
      if (!prior) continue;
      if (next.sell !== prior.sell) {
        recentPriceChanges.push({
          name: next.name,
          sku: next.sku,
          field: "selling price",
          direction: next.sell > prior.sell ? "increased" : "decreased",
          from: prior.sell,
          to: next.sell,
        });
      }
      if (next.cost !== prior.cost) {
        recentPriceChanges.push({
          name: next.name,
          sku: next.sku,
          field: "cost",
          direction: next.cost > prior.cost ? "increased" : "decreased",
          from: prior.cost,
          to: next.cost,
        });
      }
    }

    const stockRows = inventory.slice(0, 200).map((row) => ({
      sku: row.products?.sku,
      name: row.products?.name,
      warehouse: row.warehouses?.name,
      available: row.quantity_available,
      min: row.products?.minimum_stock_level,
      cost: row.products?.cost_price,
    }));
    const briefing = buildOperationsBrief({
      sales: (sales.data ?? []).map((sale) => ({
        total: sale.total,
        status: sale.status,
        sale_date: sale.sale_date,
        payment_status: sale.payment_status,
        balance: sale.balance,
        customer: (sale.customers as { name?: string } | null)?.name ?? null,
      })),
      saleItems: (saleItems.data ?? []).map((item) => {
        const sale = item.sales as { status?: string; sale_date?: string } | null;
        const product = item.products as { name?: string; sku?: string } | null;
        return {
          name: product?.name,
          sku: product?.sku,
          quantity: item.quantity,
          total: item.total,
          sale_date: sale?.sale_date,
          status: sale?.status,
        };
      }),
      stock: stockRows,
      purchases: purchases.data ?? [],
    });
    const context = {
      currency: session.business?.currency,
      fx: { companyUsdNgnRate, liveUsdNgnRate },
      recentPriceChanges: recentPriceChanges.slice(0, 12),
      products: products.data ?? [],
      stock: stockRows,
      recentSales: (sales.data ?? []).slice(0, 15),
      unreadAlerts: alerts.data ?? [],
      ...briefing,
    };

    const fallback = answerFromInventory(q, context);
    if (isAiConfigured()) {
      try {
        const turns: ChatTurn[] = [
          ...history
            .filter((turn) => turn.content.trim())
            .slice(-10)
            .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1200) })),
          {
            role: "user",
            content: `Question: ${q}\n\nLive AAML data (use only this):\n${JSON.stringify(context)}`,
          },
        ];
        const answer = await completeChat(
          "You are AAML's staff operations assistant. Answer any practical question from the live briefing: monthly revenue, scarce SKUs (stock vs real sales), best sellers, dead stock, unpaid invoices, purchases, customers, margins, dollar/naira rates, and price moves. Use only provided numbers. If something is missing, say you do not have it. Never invent SKUs or market prices outside this data. Keep answers short and useful.",
          turns,
        );
        if (answer?.trim()) return ok(answer.trim());
      } catch (error) {
        logError("ask-ai-model", error);
        return ok(`${fallback}\n\n(Live inventory answer — the AI model could not be reached.)`);
      }
    }
    return ok(fallback);
  } catch (error) {
    logError("ask-ai", error);
    return fail(getErrorMessage(error, "Unable to answer that question."));
  }
}

export async function getDashboardInsightsAction() {
  const session = await requirePermission("dashboard.read");
  await syncStockAlerts(session.businessId);
  const [reorder, demand] = await Promise.all([getReorderAdviceAction(), getDemandForecastAction().catch(() => null)]);
  return ok({
    configured: isAiConfigured(),
    business: session.business.business_name,
    reorder: reorder.ok ? reorder.data : { items: [], commentary: null, configured: isAiConfigured() },
    demand: demand && demand.ok ? demand.data : null,
  });
}
