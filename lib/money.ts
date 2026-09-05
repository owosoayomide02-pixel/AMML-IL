import { formatCurrency } from "@/lib/utils";

export const NGN_PRICE_STEP = 5000;
export const USD_PRICE_STEP = 1;
export const DEFAULT_USD_NGN_RATE = 1500;

export function ngnToUsd(naira: number, rate = DEFAULT_USD_NGN_RATE) {
  const safe = rate > 0 ? rate : DEFAULT_USD_NGN_RATE;
  return Math.round((Number(naira) || 0) / safe * 100) / 100;
}

export function usdToNgn(dollars: number, rate = DEFAULT_USD_NGN_RATE) {
  const safe = rate > 0 ? rate : DEFAULT_USD_NGN_RATE;
  return Math.round((Number(dollars) || 0) * safe);
}

export function formatNgnUsd(naira: number | string | null | undefined, rate = DEFAULT_USD_NGN_RATE) {
  const amount = Number(naira ?? 0);
  return `${formatCurrency(amount, "NGN")} · ${formatCurrency(ngnToUsd(amount, rate), "USD")}`;
}
