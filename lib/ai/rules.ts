import { toNumber } from "@/lib/utils";

const TARGET_MARGIN = 0.3;

export function analyzePrice(cost: number, selling: number, history: Array<{ cost_price: number; selling_price: number; created_at: string }>) {
  const costPrice = toNumber(cost);
  const sellingPrice = toNumber(selling);
  const margin = sellingPrice <= 0 ? 0 : (sellingPrice - costPrice) / sellingPrice;
  const suggested = Math.round(costPrice * (1 + TARGET_MARGIN) * 100) / 100;
  const previous = history[1];
  const costDelta = previous ? costPrice - toNumber(previous.cost_price) : 0;
  const sellDelta = previous ? sellingPrice - toNumber(previous.selling_price) : 0;
  const flags: string[] = [];
  if (sellingPrice < costPrice) flags.push("Selling price is below cost.");
  else if (margin < 0.1) flags.push("Margin is thin (under 10%).");
  if (Math.abs(costDelta) >= costPrice * 0.15 && costPrice > 0) flags.push("Cost moved more than 15% since the last change.");
  if (Math.abs(sellDelta) >= sellingPrice * 0.15 && sellingPrice > 0) flags.push("Selling price moved more than 15% since the last change.");

  return {
    costPrice,
    sellingPrice,
    margin,
    suggested,
    flags,
    history: history.slice(0, 8),
  };
}

export function buildReorderAdvice(
  rows: Array<{
    productId: string;
    name: string;
    sku: string;
    available: number;
    minimum: number;
    reorderQty: number;
    sold30: number;
  }>,
) {
  return rows
    .filter((row) => row.available <= row.minimum)
    .map((row) => {
      const velocity = row.sold30 / 30;
      const cover = velocity > 0 ? Math.ceil(row.available / velocity) : null;
      const suggested = Math.max(row.reorderQty || 0, Math.ceil(velocity * 14) - row.available, 0);
      return {
        ...row,
        daysOfCover: cover,
        suggestedQty: Math.max(suggested, 1),
        reason:
          row.available <= 0
            ? "Out of stock"
            : cover != null && cover <= 7
              ? `About ${cover} days of cover at recent sales pace`
              : "At or below the minimum stock level",
      };
    })
    .sort((a, b) => a.available - b.available)
    .slice(0, 12);
}

export function buildDemandForecast(
  series: Array<{ date: string; qty: number; revenue: number }>,
) {
  const recent = series.slice(-14);
  const earlier = series.slice(-28, -14);
  const recentQty = recent.reduce((sum, day) => sum + day.qty, 0);
  const earlierQty = earlier.reduce((sum, day) => sum + day.qty, 0);
  const recentRevenue = recent.reduce((sum, day) => sum + day.revenue, 0);
  const daily = recentQty / Math.max(recent.length, 1);
  const change = earlierQty === 0 ? (recentQty > 0 ? 1 : 0) : (recentQty - earlierQty) / earlierQty;
  return {
    last14Qty: recentQty,
    last14Revenue: recentRevenue,
    projected14Qty: Math.round(daily * 14 * 10) / 10,
    changePct: Math.round(change * 100),
    trend: change > 0.1 ? "up" : change < -0.1 ? "down" : "flat",
    series: recent,
  };
}
