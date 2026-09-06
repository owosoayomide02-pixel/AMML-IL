import { describe, expect, it } from "vitest";
import { buildOperationsBrief } from "@/lib/ai/briefing";

describe("buildOperationsBrief", () => {
  const today = new Date("2026-09-06T12:00:00Z");

  it("totals this month and last month revenue", () => {
    const brief = buildOperationsBrief({
      today,
      sales: [
        { total: 50000, status: "completed", sale_date: "2026-09-02", payment_status: "paid", balance: 0, customer: "Dangote" },
        { total: 20000, status: "completed", sale_date: "2026-08-20", payment_status: "unpaid", balance: 20000, customer: "Shoprite" },
        { total: 9999, status: "cancelled", sale_date: "2026-09-03", payment_status: "unpaid", balance: 9999, customer: "X" },
      ],
      saleItems: [],
      stock: [],
      purchases: [{ total: 8000, status: "received", purchase_date: "2026-09-01" }],
    });
    expect(brief.thisMonthRevenue).toBe(50000);
    expect(brief.lastMonthRevenue).toBe(20000);
    expect(brief.thisMonthInvoices).toBe(1);
    expect(brief.purchaseSpendThisMonth).toBe(8000);
    expect(brief.unpaid).toBe(20000);
    expect(brief.topCustomers[0]?.name).toBe("Dangote");
  });

  it("ranks scarce SKUs from real sales vs remaining stock", () => {
    const brief = buildOperationsBrief({
      today,
      sales: [],
      saleItems: [
        { name: "Siemens relay", sku: "REL-24", quantity: 20, total: 200000, sale_date: "2026-09-01", status: "completed" },
        { name: "Cable", sku: "CAB-1", quantity: 1, total: 1000, sale_date: "2026-09-01", status: "completed" },
      ],
      stock: [
        { name: "Siemens relay", sku: "REL-24", available: 0, min: 10, cost: 8000 },
        { name: "Cable", sku: "CAB-1", available: 80, min: 5, cost: 500 },
        { name: "Old valve", sku: "VAL-1", available: 12, min: 2, cost: 4000 },
      ],
      purchases: [],
    });
    expect(brief.scarce[0]?.sku).toBe("REL-24");
    expect(brief.scarce[0]?.reason).toContain("out of stock");
    expect(brief.topSellers[0]?.sku).toBe("REL-24");
    expect(brief.deadStock.some((row) => row.sku === "VAL-1")).toBe(true);
  });
});
