import { describe, expect, it } from "vitest";
import { answerFromInventory, type AssistantContext } from "@/lib/ai/assistant";

const ctx: AssistantContext = {
  currency: "NGN",
  products: [
    { name: "Siemens relay", sku: "REL-24", cost_price: 8000, selling_price: 12000, minimum_stock_level: 10, status: "active" },
    { name: "Cheap cable", sku: "CAB-1", cost_price: 9000, selling_price: 9500, minimum_stock_level: 5, status: "active" },
  ],
  stock: [
    { sku: "REL-24", name: "Siemens relay", warehouse: "Lagos", available: 0, min: 10 },
    { sku: "CAB-1", name: "Cheap cable", warehouse: "Lagos", available: 3, min: 5 },
    { sku: "OK-1", name: "Healthy SKU", warehouse: "Abuja", available: 40, min: 5 },
  ],
  recentSales: [{ invoice_number: "INV-0001", total: 24000, status: "completed", sale_date: "2026-09-01" }],
  unreadAlerts: [{ title: "Siemens relay is out of stock", severity: "critical" }],
  fx: { companyUsdNgnRate: 1500, liveUsdNgnRate: 1540 },
  recentPriceChanges: [
    { name: "Siemens relay", sku: "REL-24", field: "selling price", direction: "increased", from: 10000, to: 12000 },
  ],
};

describe("answerFromInventory", () => {
  it("lists out-of-stock SKUs", () => {
    const answer = answerFromInventory("What is out of stock?", ctx);
    expect(answer).toContain("Out of stock (1)");
    expect(answer).toContain("Siemens relay (REL-24) in Lagos");
  });

  it("lists low and empty SKUs for a reorder question", () => {
    const answer = answerFromInventory("What is running low this week?", ctx);
    expect(answer).toContain("Needs attention (2 SKUs)");
    expect(answer).toContain("Siemens relay");
    expect(answer).toContain("Cheap cable");
    expect(answer).not.toContain("Healthy SKU");
  });

  it("lists unread alerts", () => {
    const answer = answerFromInventory("Any alerts?", ctx);
    expect(answer).toContain("Unread alerts (1)");
    expect(answer).toContain("critical: Siemens relay is out of stock");
  });

  it("summarizes recent sales", () => {
    const answer = answerFromInventory("Show recent sales", ctx);
    expect(answer).toContain("INV-0001");
    expect(answer).toContain("24000.00 NGN");
  });

  it("lists thin-margin SKUs", () => {
    const answer = answerFromInventory("Which SKUs have thin margins?", ctx);
    expect(answer).toContain("Cheap cable (CAB-1)");
    expect(answer).not.toContain("Siemens relay (REL-24) cost");
  });

  it("answers a named SKU from live stock", () => {
    const answer = answerFromInventory("How much REL-24 do we have?", ctx);
    expect(answer).toContain("Siemens relay (REL-24) has 0 available");
    expect(answer).toContain("Cost 8000");
  });

  it("returns a company snapshot when the question does not match a topic", () => {
    const answer = answerFromInventory("Give me a status update", ctx);
    expect(answer).toContain("Company snapshot from live inventory");
    expect(answer).toContain("2 active SKUs");
    expect(answer).toContain("Watch list");
    expect(answer).toContain("1 USD = ₦1500");
  });

  it("answers dollar and naira rates", () => {
    const answer = answerFromInventory("What is the dollar rate?", ctx);
    expect(answer).toContain("Company rate: 1 USD = ₦1500");
    expect(answer).toContain("Live market rate: 1 USD = ₦1540");
  });

  it("lists recent price increases and decreases", () => {
    const answer = answerFromInventory("Which prices increased or decreased?", ctx);
    expect(answer).toContain("Siemens relay (REL-24) selling price increased from 10000 to 12000");
  });
});
