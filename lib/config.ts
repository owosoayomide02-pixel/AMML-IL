/**
 * Central application configuration.
 * Rename the product from this file — UI, metadata, emails, and SKU defaults read from here.
 */
export const appConfig = {
  name: "Inventory Pro",
  slug: "inventory-pro",
  description:
    "Professional inventory management for products, stock, sales, purchases, warehouses, and reports.",
  supportEmail: "support@inventorypro.app",
  defaultCurrency: "USD",
  defaultCountry: "United States",
  defaultUnit: "pcs",
  skuPrefix: "SKU",
  invoicePrefix: "INV",
  purchasePrefix: "PO",
  transferPrefix: "TR",
  countPrefix: "CNT",
  documentNumberPadding: 6,
} as const;

export type AppConfig = typeof appConfig;
