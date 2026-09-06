import { describe, expect, it } from "vitest";
import { guessCategory, parseBulkStockText } from "@/lib/bulk-stock";

describe("parseBulkStockText", () => {
  it("maps a header CSV by column name", () => {
    const items = parseBulkStockText(
      ["Name,SKU,Quantity,Cost,Selling,Category,Brand", "Siemens 24V relay,REL-24,50,8000,12000,Switchgear,Siemens"].join("\n"),
    );
    expect(items).toEqual([
      {
        name: "Siemens 24V relay",
        sku: "REL-24",
        category: "Switchgear",
        brand: "Siemens",
        quantity: 50,
        costPrice: 8000,
        sellingPrice: 12000,
        minimumStockLevel: 0,
        unit: "pcs",
      },
    ]);
  });

  it("parses the documented example line without treating category as a price", () => {
    const items = parseBulkStockText("Siemens 24V relay, REL-24, 50, 8000, 12000, Switchgear");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Siemens 24V relay",
      sku: "REL-24",
      quantity: 50,
      costPrice: 8000,
      sellingPrice: 12000,
      category: "Switchgear",
    });
  });

  it("treats a trailing number on a name+qty line as quantity, not cost", () => {
    const items = parseBulkStockText("Omron proximity sensor, 20");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Omron proximity sensor",
      sku: "",
      quantity: 20,
      costPrice: 0,
      sellingPrice: 0,
    });
  });

  it("does not pull digits out of the product name as a cost", () => {
    const items = parseBulkStockText("Siemens 24V relay, 50");
    expect(items[0].name).toBe("Siemens 24V relay");
    expect(items[0].quantity).toBe(50);
    expect(items[0].costPrice).toBe(0);
    expect(items[0].sellingPrice).toBe(0);
  });
});

describe("guessCategory", () => {
  it("classifies common automation spare names", () => {
    expect(guessCategory("Siemens 24V relay")).toBe("Switchgear");
    expect(guessCategory("Omron proximity sensor")).toBe("Sensors");
    expect(guessCategory("Control cable 2.5mm")).toBe("Cables");
    expect(guessCategory("Siemens PLC module")).toBe("Automation");
    expect(guessCategory("3-phase motor")).toBe("Drives");
    expect(guessCategory("Pneumatic valve")).toBe("Pneumatics");
    expect(guessCategory("Toolbox")).toBe("General");
  });
});
