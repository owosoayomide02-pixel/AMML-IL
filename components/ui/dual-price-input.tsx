"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_USD_NGN_RATE, NGN_PRICE_STEP, USD_PRICE_STEP, ngnToUsd, usdToNgn } from "@/lib/money";

export function DualPriceInput({
  label,
  naira,
  onNairaChange,
  rate = DEFAULT_USD_NGN_RATE,
  name,
}: {
  label: string;
  naira: number;
  onNairaChange: (value: number) => void;
  rate?: number;
  name?: string;
}) {
  const usd = ngnToUsd(naira, rate);

  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input
            name={name}
            type="number"
            min={0}
            step={NGN_PRICE_STEP}
            value={Number.isFinite(naira) ? naira : 0}
            onChange={(event) => onNairaChange(Number(event.target.value) || 0)}
          />
          <p className="mt-1 text-[11px] text-slate-400">NGN · arrows ±{NGN_PRICE_STEP.toLocaleString()}</p>
        </div>
        <div>
          <Input
            type="number"
            min={0}
            step={USD_PRICE_STEP}
            value={Number.isFinite(usd) ? usd : 0}
            onChange={(event) => onNairaChange(usdToNgn(Number(event.target.value) || 0, rate))}
          />
          <p className="mt-1 text-[11px] text-slate-400">USD · 1 USD = ₦{rate.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
