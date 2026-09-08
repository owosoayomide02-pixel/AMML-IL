import { stockStatus, toNumber } from "@/lib/utils";

export const STOCK_SHEET_LABELS = {
  itemId: "Item ID",
  make: "MAKE",
  description: "SPARES DESCRIPTION",
  partNumber: "PART NUMBER",
  unitPrice: "UNIT PRICE",
  condition: "CONDITION",
  location: "LOCATION",
  rackNumber: "RACK NUMBER",
  stockLevel: "STOCK LEVEL",
  reorderLevel: "RE-ORDER LEVEL",
  totalPrice: "TOTAL INVENTORY PRICE",
  stockStatus: "STOCK STATUS",
  remarks: "REMARKS",
  orderStatus: "ORDER STATUS",
} as const;

export type SpareIdentity = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  brand?: string | null;
  item_code?: string | null;
};

export type StockSheetProduct = (SpareIdentity & {
  condition?: string | null;
  rack_number?: string | null;
  remarks?: string | null;
  order_status?: string | null;
  cost_price?: number | string | null;
  minimum_stock_level?: number | string | null;
}) | null;

export function formatSpareOption(product: SpareIdentity) {
  const make = product.brand?.trim();
  const name = product.name?.trim() || "Spare";
  const part = product.sku?.trim();
  return [make, name, part].filter(Boolean).join(" · ");
}

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
    description: row.products?.name?.trim() || "Spare",
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

export type StockSheetRow = ReturnType<typeof toStockSheetRow>;

export function productToStockSheetRow(
  product: NonNullable<StockSheetProduct> & {
    inventory?: Array<{
      quantity_on_hand?: number | string | null;
      quantity_available?: number | string | null;
      warehouses?: { name?: string | null } | null;
    }>;
  },
  index: number,
) {
  const inventory = product.inventory ?? [];
  const onHand = inventory.reduce((sum, row) => sum + toNumber(row.quantity_on_hand ?? row.quantity_available), 0);
  const available = inventory.reduce((sum, row) => sum + toNumber(row.quantity_available ?? row.quantity_on_hand), 0);
  const locations = [...new Set(inventory.map((row) => row.warehouses?.name?.trim()).filter(Boolean))] as string[];
  return toStockSheetRow(
    {
      products: product,
      warehouses: { name: locations.join(", ") || "—" },
      quantity_on_hand: onHand,
      quantity_available: available,
    },
    index,
  );
}

export function toStockSheetExport(row: StockSheetRow) {
  return {
    [STOCK_SHEET_LABELS.itemId]: row.itemId,
    [STOCK_SHEET_LABELS.make]: row.make,
    [STOCK_SHEET_LABELS.description]: row.description,
    [STOCK_SHEET_LABELS.partNumber]: row.partNumber,
    [STOCK_SHEET_LABELS.unitPrice]: row.unitPrice,
    [STOCK_SHEET_LABELS.condition]: row.condition,
    [STOCK_SHEET_LABELS.location]: row.location === "—" ? "" : row.location,
    [STOCK_SHEET_LABELS.rackNumber]: row.rackNumber === "—" ? "" : row.rackNumber,
    [STOCK_SHEET_LABELS.stockLevel]: row.stockLevel,
    [STOCK_SHEET_LABELS.reorderLevel]: row.reorderLevel,
    [STOCK_SHEET_LABELS.totalPrice]: row.totalPrice,
    [STOCK_SHEET_LABELS.stockStatus]: row.stockStatusLabel,
    [STOCK_SHEET_LABELS.remarks]: row.remarks,
    [STOCK_SHEET_LABELS.orderStatus]: row.orderStatus === "—" ? "" : row.orderStatus,
  };
}
