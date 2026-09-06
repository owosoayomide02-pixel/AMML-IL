import { toNumber } from "@/lib/utils";

export type MonthBucket = { month: string; label: string; revenue: number; invoices: number };
export type SellerRow = { name: string; sku: string; qty: number; revenue: number };
export type ScarceRow = {
  name: string;
  sku: string;
  available: number;
  sold30: number;
  daysOfCover: number | null;
  reason: string;
};
export type CustomerRow = { name: string; invoices: number; revenue: number; unpaid: number };

function monthKey(value: string | null | undefined) {
  return String(value ?? "").slice(0, 7);
}

function monthLabel(key: string) {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const date = new Date(`${key}-01T00:00:00`);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function shiftMonth(base: Date, offset: number) {
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildOperationsBrief(input: {
  today?: Date;
  sales: Array<{
    total?: number | string | null;
    status?: string | null;
    sale_date?: string | null;
    payment_status?: string | null;
    balance?: number | string | null;
    customer?: string | null;
  }>;
  saleItems: Array<{
    name?: string | null;
    sku?: string | null;
    quantity?: number | string | null;
    total?: number | string | null;
    sale_date?: string | null;
    status?: string | null;
  }>;
  stock: Array<{
    name?: string | null;
    sku?: string | null;
    available?: number | string | null;
    min?: number | string | null;
    cost?: number | string | null;
  }>;
  purchases: Array<{
    total?: number | string | null;
    status?: string | null;
    purchase_date?: string | null;
  }>;
}) {
  const today = input.today ?? new Date();
  const thisMonth = shiftMonth(today, 0);
  const lastMonth = shiftMonth(today, -1);
  const since30 = new Date(today);
  since30.setDate(since30.getDate() - 30);
  const since30Key = since30.toISOString().slice(0, 10);

  const liveSales = input.sales.filter((sale) => sale.status !== "cancelled");
  const months = new Map<string, MonthBucket>();
  for (let i = 5; i >= 0; i -= 1) {
    const key = shiftMonth(today, -i);
    months.set(key, { month: key, label: monthLabel(key), revenue: 0, invoices: 0 });
  }
  for (const sale of liveSales) {
    const key = monthKey(sale.sale_date);
    const bucket = months.get(key);
    if (!bucket) continue;
    bucket.revenue += toNumber(sale.total);
    bucket.invoices += 1;
  }

  const sellers = new Map<string, SellerRow>();
  for (const item of input.saleItems) {
    if (item.status === "cancelled") continue;
    if (String(item.sale_date ?? "") < since30Key) continue;
    const sku = item.sku || item.name || "SKU";
    const current = sellers.get(sku) ?? { name: item.name || sku, sku, qty: 0, revenue: 0 };
    current.qty += toNumber(item.quantity);
    current.revenue += toNumber(item.total);
    sellers.set(sku, current);
  }
  const topSellers = [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);

  const scarce: ScarceRow[] = input.stock
    .map((row) => {
      const available = toNumber(row.available);
      const sold30 = sellers.get(row.sku || "")?.qty ?? 0;
      const daysOfCover = sold30 > 0 ? Math.ceil((available / sold30) * 30) : available <= 0 ? 0 : null;
      const reason =
        available <= 0 && sold30 > 0
          ? "Sold in the last 30 days and now out of stock"
          : available <= 0
            ? "Out of stock"
            : daysOfCover != null && daysOfCover <= 14
              ? `About ${daysOfCover} days of cover at the current sales pace`
              : available <= toNumber(row.min)
                ? "At or below the minimum level"
                : "Low available quantity";
      return {
        name: row.name || "Product",
        sku: row.sku || "",
        available,
        sold30,
        daysOfCover,
        reason,
      };
    })
    .filter((row) => row.available <= 0 || (row.daysOfCover != null && row.daysOfCover <= 14) || (row.sold30 > 0 && row.available <= row.sold30))
    .sort((a, b) => {
      const coverA = a.daysOfCover ?? (a.available <= 0 ? 0 : 999);
      const coverB = b.daysOfCover ?? (b.available <= 0 ? 0 : 999);
      return coverA - coverB || a.available - b.available;
    })
    .slice(0, 8);

  const deadStock = input.stock
    .map((row) => ({
      name: row.name || "Product",
      sku: row.sku || "",
      available: toNumber(row.available),
      sold30: sellers.get(row.sku || "")?.qty ?? 0,
      value: toNumber(row.available) * toNumber(row.cost),
    }))
    .filter((row) => row.available > 0 && row.sold30 === 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const customers = new Map<string, CustomerRow>();
  for (const sale of liveSales) {
    const name = sale.customer?.trim() || "Walk-in";
    const current = customers.get(name) ?? { name, invoices: 0, revenue: 0, unpaid: 0 };
    current.invoices += 1;
    current.revenue += toNumber(sale.total);
    if (sale.payment_status !== "paid") current.unpaid += toNumber(sale.balance);
    customers.set(name, current);
  }

  const stockValue = input.stock.reduce((sum, row) => sum + toNumber(row.available) * toNumber(row.cost), 0);
  const unpaid = liveSales
    .filter((sale) => sale.payment_status !== "paid")
    .reduce((sum, sale) => sum + toNumber(sale.balance), 0);
  const purchaseSpendThisMonth = input.purchases
    .filter((row) => row.status !== "cancelled" && monthKey(row.purchase_date) === thisMonth)
    .reduce((sum, row) => sum + toNumber(row.total), 0);

  return {
    thisMonth,
    lastMonth,
    thisMonthRevenue: months.get(thisMonth)?.revenue ?? 0,
    lastMonthRevenue: months.get(lastMonth)?.revenue ?? 0,
    thisMonthInvoices: months.get(thisMonth)?.invoices ?? 0,
    months: [...months.values()],
    topSellers,
    scarce,
    deadStock,
    topCustomers: [...customers.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    stockValue,
    unpaid,
    purchaseSpendThisMonth,
  };
}

export function suggestLocalEquivalents(
  question: string,
  products: Array<{ name?: string | null; sku?: string | null }>,
) {
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !["what", "this", "that", "with", "from", "have", "most", "product"].includes(token));
  if (!tokens.length) return [];
  return products
    .map((product) => {
      const hay = `${product.name ?? ""} ${product.sku ?? ""}`.toLowerCase();
      const score = tokens.filter((token) => hay.includes(token)).length;
      return { name: product.name ?? "", sku: product.sku ?? "", score };
    })
    .filter((row) => row.score > 0 && row.name)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ name, sku }) => ({ name, sku }));
}
