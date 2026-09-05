/**
 * Central application configuration.
 * Rename the product from this file — UI, metadata, emails, and SKU defaults read from here.
 */
export const appConfig = {
  name: "All Automation Modules",
  shortName: "AAML",
  displayName: "AAML Automation",
  slug: "aaml-inventory",
  slogan: "Makes Life Smart",
  tagline: "Staff inventory for All Automation Modules.",
  description:
    "Inventory workspace for All Automation Modules — track automation spares, stock, sales, purchases, and warehouses.",
  website: "https://www.allautomationmodules.com",
  appUrl: "https://inventory.allautomationmodules.com",
  supportEmail: "contact@allautomationmodules.com",
  defaultCurrency: "NGN",
  defaultCountry: "Nigeria",
  defaultUnit: "pcs",
  skuPrefix: "AAML",
  invoicePrefix: "INV",
  purchasePrefix: "PO",
  transferPrefix: "TR",
  countPrefix: "CNT",
  documentNumberPadding: 6,
} as const;

export type AppConfig = typeof appConfig;
