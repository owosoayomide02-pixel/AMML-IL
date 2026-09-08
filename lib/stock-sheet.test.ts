import { describe, expect, it } from "vitest";
import { spareRemarks, spareStockStatus, toStockSheetRow } from "@/lib/stock-sheet";

describe("spare stock sheet", () => {
  it("uses In Stock and Stock Good when quantity is healthy", () => {
    const row = toStockSheetRow(
      {
        products: {
          id: "p1",
          name: "Pressure Sensor",
          sku: "1089-9625-12",
          brand: "SIEMENS",
          item_code: "1",
          condition: "NEW",
          cost_price: 25000,
          minimum_stock_level: 2,
        },
        warehouses: { name: "ABUJA" },
        quantity_on_hand: 4,
        quantity_available: 4,
      },
      0,
    );
    expect(row).toMatchObject({
      itemId: "1",
      make: "SIEMENS",
      partNumber: "1089-9625-12",
      location: "ABUJA",
      stockLevel: 4,
      totalPrice: 100000,
      stockStatusLabel: "In Stock",
      remarks: "Stock Good",
    });
  });

  it("marks empty bins as Out of Stock and Reorder needed", () => {
    expect(spareStockStatus(0)).toBe("out_of_stock");
    expect(spareRemarks(0, 2)).toBe("Reorder needed");
  });
});
