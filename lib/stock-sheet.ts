import { stockStatus, toNumber } from "@/lib/utils";

export type StockSheetProduct = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  brand?: string | null;
  item_code?: string | null;
  condition?: string | null;
  rack_number?: string | null;
  remarks?: string | null;
  order_status?: string | null;
  cost_price?: number | string | null;
  minimum_stock_level?: number | string | null;
} | null;

export function spareStockStatus(available: number) {
  return available > 0 ? ("in_stock" as const) : ("out_of_stock" as const);
}

export function spareRemarks(available: number, minimum: number, stored?: string | null) {
  const custom = stored?.trim();
  if (custom) return custom;
  if (available <= 0 || (minimum > 0 && available <= minimum)) return "Reorder needed";
  return "Stock Good";
}

export function toStockSheetRow(
  row: {
    products: StockSheetProduct;
    warehouses?: { name?: string | null } | null;
    quantity_on_hand: number | string | null;
    quantity_available: number | string | null;
  },
  index: number,
) {
  const onHand = toNumber(row.quantity_on_hand);
  const available = toNumber(row.quantity_available);
  const reorderLevel = toNumber(row.products?.minimum_stock_level);
  const unitPrice = toNumber(row.products?.cost_price);
  const status = spareStockStatus(available);

  return {
    itemId: row.products?.item_code?.trim() || String(index + 1),
    make: row.products?.brand?.trim() || "—",
    description: row.products?.name?.trim() || "Product",
    partNumber: row.products?.sku?.trim() || "—",
    unitPrice,
    condition: row.products?.condition?.trim() || "NEW",
    location: row.warehouses?.name?.trim() || "—",
    rackNumber: row.products?.rack_number?.trim() || "—",
    stockLevel: onHand,
    reorderLevel,
    totalPrice: onHand * unitPrice,
    stockStatus: status,
    stockStatusLabel: status === "in_stock" ? "In Stock" : "Out of Stock",
    remarks: spareRemarks(available, reorderLevel, row.products?.remarks),
    orderStatus: row.products?.order_status?.trim() || "—",
    detailStatus: stockStatus(available, reorderLevel),
    productId: row.products?.id,
  };
}
