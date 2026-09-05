import "server-only";

import { DEFAULT_USD_NGN_RATE } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils";
import type { Alert, AuditLog, Category, Customer, Product, Profile, Supplier, Warehouse } from "@/types";

export async function listCategories(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  return (data ?? []) as Category[];
}

export async function listWarehouses(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("warehouses")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  return (data ?? []) as Warehouse[];
}

export async function listProducts(businessId: string, options?: { includeArchived?: boolean; q?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, categories(name), inventory(quantity_on_hand, quantity_available)")
    .eq("business_id", businessId)
    .order("name");
  if (!options?.includeArchived) query = query.eq("status", "active");
  if (options?.q) query = query.or(`name.ilike.%${options.q}%,sku.ilike.%${options.q}%,barcode.ilike.%${options.q}%`);
  const { data } = await query;
  return (data ?? []) as Array<
    Product & {
      categories: { name: string } | null;
      inventory: Array<{ quantity_on_hand: number; quantity_available: number }>;
    }
  >;
}

export async function getProduct(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, categories(name), inventory(*, warehouses(name, code))")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data as
    | (Product & {
        categories: { name: string } | null;
        inventory: Array<{
          id: string;
          warehouse_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
          quantity_available: number;
          warehouses: { name: string; code: string } | null;
        }>;
      })
    | null;
}

export async function listInventory(businessId: string, q?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("*, products(id, name, sku, unit, cost_price, selling_price, minimum_stock_level, reorder_quantity, status), warehouses(name, code)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as Array<{
    id: string;
    product_id: string;
    warehouse_id: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;
    updated_at: string;
    products: {
      id: string;
      name: string;
      sku: string;
      unit: string;
      cost_price: number;
      selling_price: number;
      minimum_stock_level: number;
      reorder_quantity: number;
      status: string;
    } | null;
    warehouses: { name: string; code: string } | null;
  }>;
  if (!q) return rows;
  const term = q.toLowerCase();
  return rows.filter(
    (row) =>
      row.products?.name.toLowerCase().includes(term) ||
      row.products?.sku.toLowerCase().includes(term) ||
      row.warehouses?.name.toLowerCase().includes(term),
  );
}

export async function listStockTransactions(businessId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stock_transactions")
    .select("*, products(name, sku), warehouses(name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listSuppliers(businessId: string, q?: string) {
  const supabase = await createClient();
  let query = supabase.from("suppliers").select("*").eq("business_id", businessId).order("supplier_name");
  if (q) query = query.or(`supplier_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  return (data ?? []) as Supplier[];
}

export async function getSupplier(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").eq("business_id", businessId).eq("id", id).maybeSingle();
  return data as Supplier | null;
}

export async function listCustomers(businessId: string, q?: string) {
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").eq("business_id", businessId).order("customer_name");
  if (q) query = query.or(`customer_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  return (data ?? []) as Customer[];
}

export async function getCustomer(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("business_id", businessId).eq("id", id).maybeSingle();
  return data as Customer | null;
}

export async function listSales(businessId: string, q?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("*, customers(customer_name)")
    .eq("business_id", businessId)
    .order("sale_date", { ascending: false });
  const rows = data ?? [];
  if (!q) return rows;
  const term = q.toLowerCase();
  return rows.filter((row) => {
    const invoice = String(row.invoice_number ?? "").toLowerCase();
    const customer = String((row.customers as { customer_name?: string } | null)?.customer_name ?? "").toLowerCase();
    return invoice.includes(term) || customer.includes(term);
  });
}

export async function getSale(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("*, customers(customer_name), sale_items(*, products(name, sku, unit), warehouses(name))")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listPurchases(businessId: string, q?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("*, suppliers(supplier_name)")
    .eq("business_id", businessId)
    .order("purchase_date", { ascending: false });
  const rows = data ?? [];
  if (!q) return rows;
  const term = q.toLowerCase();
  return rows.filter((row) => {
    const number = String(row.purchase_number ?? "").toLowerCase();
    const supplier = String((row.suppliers as { supplier_name?: string } | null)?.supplier_name ?? "").toLowerCase();
    return number.includes(term) || supplier.includes(term);
  });
}

export async function getPurchase(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("*, suppliers(supplier_name), purchase_items(*, products(name, sku, unit), warehouses(name))")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listTransfers(businessId: string) {
  const supabase = await createClient();
  const [{ data: transfers }, warehouses] = await Promise.all([
    supabase.from("stock_transfers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    listWarehouses(businessId),
  ]);
  const map = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
  return (transfers ?? []).map((transfer) => ({
    ...transfer,
    from: map.get(transfer.from_warehouse_id) ?? null,
    to: map.get(transfer.to_warehouse_id) ?? null,
  }));
}

export async function getTransfer(businessId: string, id: string) {
  const supabase = await createClient();
  const [{ data: transfer }, warehouses] = await Promise.all([
    supabase
      .from("stock_transfers")
      .select("*, stock_transfer_items(*, products(name, sku, unit))")
      .eq("business_id", businessId)
      .eq("id", id)
      .maybeSingle(),
    listWarehouses(businessId),
  ]);
  if (!transfer) return null;
  const map = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
  return {
    ...transfer,
    from: map.get(transfer.from_warehouse_id) ?? null,
    to: map.get(transfer.to_warehouse_id) ?? null,
  };
}

export async function listCounts(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_counts")
    .select("*, warehouses(name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCount(businessId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_counts")
    .select("*, warehouses(name, code), inventory_count_items(*, products(name, sku, unit))")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listAlerts(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as Alert[];
}

export async function listUsers(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("business_id", businessId).order("full_name");
  return (data ?? []) as Profile[];
}

export async function listAuditLogs(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name, email)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as Array<AuditLog & { profiles: { full_name: string; email: string } | null }>;
}

export async function getUsdNgnRate(businessId: string) {
  const settings = await listSettings(businessId);
  const stored = settings.get("usd_ngn_rate") as { rate?: number } | undefined;
  const rate = Number(stored?.rate);
  return rate > 0 ? rate : DEFAULT_USD_NGN_RATE;
}

export async function listSettings(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("setting_key, setting_value").eq("business_id", businessId);
  const map = new Map<string, unknown>();
  for (const row of data ?? []) map.set(row.setting_key, row.setting_value);
  return map;
}

export async function listPriceHistory(businessId: string, productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_price_history")
    .select("*")
    .eq("business_id", businessId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return [];
  return data ?? [];
}

export async function getDashboardData(businessId: string) {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [products, inventory, sales, purchases, alerts, recentSales, recentTx, monthSales] = await Promise.all([
    supabase.from("products").select("id, name, sku, cost_price, selling_price, status, minimum_stock_level").eq("business_id", businessId),
    supabase.from("inventory").select("product_id, quantity_on_hand, quantity_available, products(cost_price, selling_price, minimum_stock_level)").eq("business_id", businessId),
    supabase.from("sales").select("id, total, status, sale_date").eq("business_id", businessId).neq("status", "cancelled"),
    supabase.from("purchases").select("id, total, status").eq("business_id", businessId).in("status", ["draft", "ordered", "partially_received"]),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_read", false),
    supabase.from("sales").select("id, invoice_number, total, status, sale_date, customers(customer_name)").eq("business_id", businessId).order("sale_date", { ascending: false }).limit(6),
    supabase.from("stock_transactions").select("id, transaction_type, quantity, created_at, products(name)").eq("business_id", businessId).order("created_at", { ascending: false }).limit(8),
    supabase.from("sales").select("sale_date, total, status").eq("business_id", businessId).gte("sale_date", monthStart).neq("status", "cancelled"),
  ]);

  const stockByProduct = new Map<string, number>();
  let onHandValue = 0;
  let retailValue = 0;
  for (const row of inventory.data ?? []) {
    const qty = toNumber(row.quantity_on_hand);
    const product = row.products as { cost_price?: number; selling_price?: number; minimum_stock_level?: number } | null;
    onHandValue += qty * toNumber(product?.cost_price);
    retailValue += qty * toNumber(product?.selling_price);
    stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + toNumber(row.quantity_available));
  }

  let lowStock = 0;
  let outOfStock = 0;
  const watchList: Array<{ id: string; name: string; sku: string; available: number; minimum: number }> = [];
  for (const product of products.data ?? []) {
    if (product.status !== "active") continue;
    const available = stockByProduct.get(product.id) ?? 0;
    const minimum = toNumber(product.minimum_stock_level);
    if (available <= 0) outOfStock += 1;
    if (available <= minimum) {
      lowStock += 1;
      watchList.push({ id: product.id, name: product.name, sku: product.sku, available, minimum });
    }
  }
  watchList.sort((a, b) => a.available - b.available);

  const salesToday = (sales.data ?? [])
    .filter((sale) => sale.sale_date >= todayIso.slice(0, 10) || sale.sale_date >= todayIso)
    .reduce((sum, sale) => sum + toNumber(sale.total), 0);

  const chartDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    const total = (monthSales.data ?? [])
      .filter((sale) => String(sale.sale_date).slice(0, 10) === key)
      .reduce((sum, sale) => sum + toNumber(sale.total), 0);
    return { date: key.slice(5), total };
  });

  return {
    skuCount: (products.data ?? []).filter((p) => p.status === "active").length,
    onHandValue,
    retailValue,
    lowStock,
    outOfStock,
    watchList: watchList.slice(0, 8),
    salesToday,
    openPurchases: purchases.data?.length ?? 0,
    unreadAlerts: alerts.count ?? 0,
    recentSales: recentSales.data ?? [],
    recentTransactions: recentTx.data ?? [],
    chartDays,
  };
}

export async function getReportData(businessId: string) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString();

  const [inventory, sales, purchases, products, saleItems] = await Promise.all([
    listInventory(businessId),
    supabase.from("sales").select("*").eq("business_id", businessId).gte("sale_date", sinceIso.slice(0, 10)).order("sale_date", { ascending: false }),
    supabase.from("purchases").select("*").eq("business_id", businessId).gte("purchase_date", sinceIso.slice(0, 10)).order("purchase_date", { ascending: false }),
    listProducts(businessId, { includeArchived: false }),
    supabase
      .from("sale_items")
      .select("quantity, selling_price, cost_price, total, products(name, sku), sales!inner(business_id, status, sale_date)")
      .eq("sales.business_id", businessId)
      .neq("sales.status", "cancelled")
      .gte("sales.sale_date", sinceIso.slice(0, 10)),
  ]);

  const velocity = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  for (const item of saleItems.data ?? []) {
    const product = item.products as { name?: string; sku?: string } | null;
    const key = product?.sku || product?.name || "unknown";
    const current = velocity.get(key) ?? { name: product?.name ?? "Unknown", sku: product?.sku ?? "", qty: 0, revenue: 0 };
    current.qty += toNumber(item.quantity);
    current.revenue += toNumber(item.total);
    velocity.set(key, current);
  }

  return {
    inventory,
    sales: sales.data ?? [],
    purchases: purchases.data ?? [],
    products,
    topProducts: [...velocity.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}
