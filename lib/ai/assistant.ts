import type { CustomerRow, MonthBucket, ScarceRow, SellerRow } from "@/lib/ai/briefing";
import { toNumber } from "@/lib/utils";

export type AssistantContext = {
  currency?: string;
  products: Array<{
    name?: string | null;
    sku?: string | null;
    cost_price?: number | null;
    selling_price?: number | null;
    minimum_stock_level?: number | null;
    status?: string | null;
  }>;
  stock: Array<{
    sku?: string | null;
    name?: string | null;
    warehouse?: string | null;
    available?: number | string | null;
    min?: number | string | null;
  }>;
  recentSales: Array<{
    invoice_number?: string | null;
    total?: number | string | null;
    status?: string | null;
    sale_date?: string | null;
  }>;
  unreadAlerts: Array<{
    title?: string | null;
    severity?: string | null;
  }>;
  fx?: {
    companyUsdNgnRate?: number | null;
    liveUsdNgnRate?: number | null;
  };
  recentPriceChanges?: Array<{
    name?: string | null;
    sku?: string | null;
    field?: string | null;
    direction?: string | null;
    from?: number | null;
    to?: number | null;
  }>;
  months?: MonthBucket[];
  thisMonthRevenue?: number;
  lastMonthRevenue?: number;
  thisMonthInvoices?: number;
  topSellers?: SellerRow[];
  scarce?: ScarceRow[];
  deadStock?: Array<{ name?: string | null; sku?: string | null; available?: number | null; sold30?: number | null }>;
  topCustomers?: CustomerRow[];
  stockValue?: number;
  unpaid?: number;
  purchaseSpendThisMonth?: number;
};

function lines(items: string[], empty: string) {
  return items.length ? items.slice(0, 8).map((item) => `• ${item}`).join("\n") : empty;
}

export function answerFromInventory(question: string, ctx: AssistantContext): string {
  const q = question.toLowerCase();
  const stock = ctx.stock.map((row) => ({
    ...row,
    available: toNumber(row.available),
    min: toNumber(row.min),
  }));
  const out = stock.filter((row) => row.available <= 0);
  const low = stock.filter((row) => row.available > 0 && row.available <= row.min);
  const products = ctx.products ?? [];
  const thin = products.filter((product) => {
    const sell = toNumber(product.selling_price);
    const cost = toNumber(product.cost_price);
    return sell > 0 && (sell - cost) / sell < 0.1;
  });

  if (/out of stock|zero stock|no stock|empty/.test(q)) {
    return `Out of stock (${out.length}):\n${lines(
      out.map((row) => `${row.name} (${row.sku}) in ${row.warehouse ?? "warehouse"}`),
      "Nothing is currently out of stock.",
    )}`;
  }

  if (/low|reorder|minimum|replenish/.test(q) && !/scarce|real market|days of cover/.test(q)) {
    return `Needs attention (${low.length + out.length} SKUs):\n${lines(
      [...out, ...low].map(
        (row) => `${row.name} (${row.sku}): ${row.available} available, minimum ${row.min}`,
      ),
      "No SKUs are at or below their minimum level.",
    )}`;
  }

  if (/scarce|scarcity|fastest selling|days of cover|real market|running out fast|most demanded/.test(q)) {
    const scarce = ctx.scarce ?? [];
    return `Most scarce in AAML's actual sales (stock vs last 30 days):\n${lines(
      scarce.map(
        (row) =>
          `${row.name} (${row.sku}): ${row.available} left, sold ${row.sold30} in 30 days${row.daysOfCover != null ? `, ~${row.daysOfCover} days cover` : ""} — ${row.reason}`,
      ),
      "Nothing looks scarce from recent sales. Record invoices to see market pressure.",
    )}`;
  }

  if (/monthly|this month|last month|revenue|turnover|how much.*(made|sold|earn)/.test(q)) {
    const months = ctx.months ?? [];
    const thisMonth = ctx.thisMonthRevenue ?? 0;
    const lastMonth = ctx.lastMonthRevenue ?? 0;
    const delta = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    return [
      `This month: ${thisMonth.toFixed(2)} ${ctx.currency ?? "NGN"} from ${ctx.thisMonthInvoices ?? 0} invoices.`,
      `Last month: ${lastMonth.toFixed(2)} ${ctx.currency ?? "NGN"} (${delta >= 0 ? "+" : ""}${delta}% vs last month).`,
      months.length
        ? `Last 6 months:\n${lines(
            months.map((month) => `${month.label}: ${month.revenue.toFixed(2)} (${month.invoices} invoices)`),
            "No monthly sales yet.",
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/best seller|topseller|top seller|most sold|fast moving/.test(q)) {
    return `Best sellers (last 30 days):\n${lines(
      (ctx.topSellers ?? []).map((row) => `${row.name} (${row.sku}): ${row.qty} sold · ${row.revenue.toFixed(2)} ${ctx.currency ?? ""}`),
      "No sales in the last 30 days.",
    )}`;
  }

  if (/dead stock|slow moving|not selling|sitting/.test(q)) {
    return `Slow / dead stock (on hand, no sales in 30 days):\n${lines(
      (ctx.deadStock ?? []).map((row) => `${row.name} (${row.sku}): ${row.available} available`),
      "No idle stock showed up in the last 30 days.",
    )}`;
  }

  if (/unpaid|outstanding|receivable|balance due/.test(q)) {
    return `Unpaid sales balance: ${(ctx.unpaid ?? 0).toFixed(2)} ${ctx.currency ?? "NGN"}.`;
  }

  if (/purchase|bought|supplier spend/.test(q)) {
    return `Purchases this month: ${(ctx.purchaseSpendThisMonth ?? 0).toFixed(2)} ${ctx.currency ?? "NGN"}.`;
  }

  if (/customer|who bought|top buyer/.test(q)) {
    return `Top customers:\n${lines(
      (ctx.topCustomers ?? []).map((row) => `${row.name}: ${row.revenue.toFixed(2)} ${ctx.currency ?? ""} · ${row.invoices} invoices · unpaid ${row.unpaid.toFixed(2)}`),
      "No customer sales are on file yet.",
    )}`;
  }

  if (/stock value|inventory value|worth/.test(q)) {
    return `On-hand stock value at cost: ${(ctx.stockValue ?? 0).toFixed(2)} ${ctx.currency ?? "NGN"}.`;
  }

  if (/alert|notif/.test(q)) {
    return `Unread alerts (${ctx.unreadAlerts.length}):\n${lines(
      ctx.unreadAlerts.map((alert) => `${alert.severity}: ${alert.title}`),
      "There are no unread alerts.",
    )}`;
  }

  if (/sale|revenue|invoice|sold/.test(q)) {
    const total = (ctx.recentSales ?? []).reduce((sum, sale) => sum + toNumber(sale.total), 0);
    return `Recent sales (${ctx.recentSales.length} latest invoices, ${total.toFixed(2)} ${ctx.currency ?? ""}):\n${lines(
      ctx.recentSales.map((sale) => `${sale.invoice_number} · ${sale.sale_date} · ${sale.total} · ${sale.status}`),
      "No sales have been recorded yet.",
    )}`;
  }

  if (/dollar|naira|exchange|fx\b|usd|ngn|currency rate|dollar rate/.test(q)) {
    const company = ctx.fx?.companyUsdNgnRate;
    const live = ctx.fx?.liveUsdNgnRate;
    return [
      company ? `Company rate: 1 USD = ₦${company}.` : "The company USD/NGN rate is not set. Use Settings → Inventory.",
      live ? `Live market rate: 1 USD = ₦${live}.` : "Live market rate is not available right now.",
      "Product prices in this app are stored in naira. USD is converted with the company rate.",
    ].join("\n");
  }

  if (/price change|increased|decreased|market price|went up|went down/.test(q)) {
    const moves = ctx.recentPriceChanges ?? [];
    return `Recent price moves (${moves.length}):\n${lines(
      moves.map(
        (row) =>
          `${row.name} (${row.sku}) ${row.field} ${row.direction} from ${row.from} to ${row.to}`,
      ),
      "No recent cost or selling-price changes are on file.",
    )}`;
  }

  if (/margin|price|cheap|cost/.test(q)) {
    return `Thin-margin SKUs (under 10%):\n${lines(
      thin.map((product) => `${product.name} (${product.sku}) cost ${product.cost_price}, sell ${product.selling_price}`),
      "No active SKUs have a margin under 10%.",
    )}`;
  }

  const match = products.find(
    (product) =>
      (product.name && q.includes(product.name.toLowerCase())) ||
      (product.sku && q.includes(product.sku.toLowerCase())),
  );
  if (match) {
    const rows = stock.filter((row) => row.sku === match.sku);
    const available = rows.reduce((sum, row) => sum + row.available, 0);
    return `${match.name} (${match.sku}) has ${available} available across warehouses. Cost ${match.cost_price}, selling ${match.selling_price}, minimum ${match.minimum_stock_level}.`;
  }

  return [
    `Company snapshot from live inventory:`,
    `• ${products.length} active SKUs`,
    `• ${out.length} out of stock`,
    `• ${low.length} at or below minimum`,
    `• ${ctx.unreadAlerts.length} unread alerts`,
    `• ${ctx.recentSales.length} recent invoices`,
    ctx.thisMonthRevenue != null ? `• This month revenue ${ctx.thisMonthRevenue.toFixed(2)} ${ctx.currency ?? ""}` : "",
    ctx.scarce?.[0] ? `• Most scarce: ${ctx.scarce[0].name} (${ctx.scarce[0].sku})` : "",
    ctx.fx?.companyUsdNgnRate ? `• Company rate 1 USD = ₦${ctx.fx.companyUsdNgnRate}` : "",
    ctx.fx?.liveUsdNgnRate ? `• Live market 1 USD = ₦${ctx.fx.liveUsdNgnRate}` : "",
    out.length || low.length
      ? `\nWatch list:\n${lines(
          [...out, ...low].map((row) => `${row.name} (${row.sku}): ${row.available} available`),
          "",
        )}`
      : "\nStock levels are at or above minimum.",
  ].filter(Boolean).join("\n");
}
