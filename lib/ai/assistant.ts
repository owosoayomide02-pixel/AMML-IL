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

  if (/low|reorder|running out|minimum|replenish/.test(q)) {
    return `Needs attention (${low.length + out.length} SKUs):\n${lines(
      [...out, ...low].map(
        (row) => `${row.name} (${row.sku}): ${row.available} available, minimum ${row.min}`,
      ),
      "No SKUs are at or below their minimum level.",
    )}`;
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
    out.length || low.length
      ? `\nWatch list:\n${lines(
          [...out, ...low].map((row) => `${row.name} (${row.sku}): ${row.available} available`),
          "",
        )}`
      : "\nStock levels are at or above minimum.",
  ].join("\n");
}
