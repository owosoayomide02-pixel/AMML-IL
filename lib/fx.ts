import { DEFAULT_USD_NGN_RATE } from "@/lib/money";

export type FxSnapshot = {
  companyUsdNgnRate: number;
  liveUsdNgnRate: number | null;
};

export function safeUsdNgnRate(rate: number | null | undefined) {
  const value = Number(rate);
  return value > 0 ? value : DEFAULT_USD_NGN_RATE;
}

export async function fetchLiveUsdNgnRate(): Promise<number | null> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { rates?: { NGN?: number } };
    const rate = Number(payload.rates?.NGN);
    return rate > 0 ? Math.round(rate * 100) / 100 : null;
  } catch {
    return null;
  }
}
