import { describe, expect, it } from "vitest";
import { analyzePrice, buildDemandForecast, buildReorderAdvice } from "@/lib/ai/rules";

describe("analyzePrice", () => {
  it("flags selling below cost", () => {
    const result = analyzePrice(10000, 8000, []);
    expect(result.margin).toBeCloseTo(-0.25);
    expect(result.flags).toContain("Selling price is below cost.");
    expect(result.suggested).toBe(13000);
  });

  it("flags a thin margin under 10%", () => {
    const result = analyzePrice(10000, 10500, []);
    expect(result.margin).toBeCloseTo(500 / 10500);
    expect(result.flags).toContain("Margin is thin (under 10%).");
  });

  it("suggests cost times 1.3 and stays quiet when margin is healthy", () => {
    const result = analyzePrice(10000, 16000, []);
    expect(result.suggested).toBe(13000);
    expect(result.flags).toEqual([]);
  });

  it("flags a cost move of more than 15% versus the previous history row", () => {
    const result = analyzePrice(12000, 18000, [
      { cost_price: 12000, selling_price: 18000, created_at: "2026-09-06" },
      { cost_price: 10000, selling_price: 18000, created_at: "2026-08-01" },
    ]);
    expect(result.flags).toContain("Cost moved more than 15% since the last change.");
  });
});

describe("buildReorderAdvice", () => {
  const base = {
    productId: "p1",
    name: "Siemens relay",
    sku: "REL-24",
    available: 2,
    minimum: 10,
    reorderQty: 20,
    sold30: 30,
  };

  it("includes SKUs at or below minimum and skips healthy stock", () => {
    const advice = buildReorderAdvice([
      base,
      { ...base, productId: "p2", sku: "OK-1", available: 50, minimum: 10 },
    ]);
    expect(advice.map((row) => row.sku)).toEqual(["REL-24"]);
    expect(advice[0].reason).toBe("About 2 days of cover at recent sales pace");
    expect(advice[0].suggestedQty).toBe(20);
  });

  it("marks zero stock as out of stock", () => {
    const advice = buildReorderAdvice([{ ...base, available: 0, sold30: 0, reorderQty: 0 }]);
    expect(advice[0].reason).toBe("Out of stock");
    expect(advice[0].suggestedQty).toBe(1);
  });
});

describe("buildDemandForecast", () => {
  function series(values: number[]) {
    return values.map((qty, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      qty,
      revenue: qty * 1000,
    }));
  }

  it("marks an upward trend when recent volume is more than 10% higher", () => {
    const result = buildDemandForecast(series([...Array(14).fill(1), ...Array(14).fill(3)]));
    expect(result.last14Qty).toBe(42);
    expect(result.trend).toBe("up");
    expect(result.changePct).toBe(200);
    expect(result.projected14Qty).toBe(42);
  });

  it("marks a downward trend when recent volume drops more than 10%", () => {
    const result = buildDemandForecast(series([...Array(14).fill(10), ...Array(14).fill(5)]));
    expect(result.trend).toBe("down");
    expect(result.changePct).toBe(-50);
  });

  it("stays flat when the change is small", () => {
    const result = buildDemandForecast(series(Array(28).fill(4)));
    expect(result.trend).toBe("flat");
    expect(result.changePct).toBe(0);
  });
});
