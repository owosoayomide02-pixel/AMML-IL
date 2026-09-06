import "server-only";

import { notifyTelegram } from "@/lib/telegram";
import { formatNgnUsd } from "@/lib/money";
import { toNumber } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

function direction(from: number, to: number) {
  if (to > from) return "increased";
  if (to < from) return "decreased";
  return null;
}

function line(label: string, from: number, to: number, rate: number) {
  const change = direction(from, to);
  if (!change) return null;
  return `${label} ${change} from ${formatNgnUsd(from, rate)} to ${formatNgnUsd(to, rate)}`;
}

export async function alertProductPriceChange(input: {
  businessId: string;
  productId: string;
  name: string;
  sku: string;
  previousCost: number;
  previousSell: number;
  nextCost: number;
  nextSell: number;
  usdNgnRate: number;
}) {
  const cost = line("Cost", toNumber(input.previousCost), toNumber(input.nextCost), input.usdNgnRate);
  const sell = line("Selling price", toNumber(input.previousSell), toNumber(input.nextSell), input.usdNgnRate);
  const parts = [cost, sell].filter(Boolean) as string[];
  if (parts.length === 0) return;

  const rose = toNumber(input.nextSell) > toNumber(input.previousSell) || toNumber(input.nextCost) > toNumber(input.previousCost);
  const title = rose ? `Price increase · ${input.name}` : `Price decrease · ${input.name}`;
  const message = `${input.sku}: ${parts.join(". ")}. Company rate 1 USD = ₦${input.usdNgnRate}.`;

  const supabase = await createClient();
  const { error } = await supabase.from("alerts").insert({
    business_id: input.businessId,
    type: rose ? "price_increase" : "price_decrease",
    title,
    message,
    severity: rose ? "warning" : "info",
    related_product_id: input.productId,
  });
  if (!error) {
    await notifyTelegram(input.businessId, `AAML ${title}\n${message}`);
  }
}

export async function alertFxRateChange(input: {
  businessId: string;
  previousRate: number;
  nextRate: number;
  liveRate?: number | null;
}) {
  const change = direction(input.previousRate, input.nextRate);
  if (!change) return;
  const title = `Dollar rate ${change}`;
  const live = input.liveRate ? ` Live market is about ₦${input.liveRate} per USD.` : "";
  const message = `Company USD/NGN rate ${change} from ₦${input.previousRate} to ₦${input.nextRate} per $1.${live}`;
  const supabase = await createClient();
  const { error } = await supabase.from("alerts").insert({
    business_id: input.businessId,
    type: "fx_rate_change",
    title,
    message,
    severity: "warning",
  });
  if (!error) {
    await notifyTelegram(input.businessId, `AAML ${title}\n${message}`);
  }
}
