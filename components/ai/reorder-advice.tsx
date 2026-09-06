"use client";

import { getReorderAdviceAction } from "@/app/actions/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ReorderAdvice() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getReorderAdviceAction>> | null>(null);

  useEffect(() => {
    void getReorderAdviceAction().then(setData);
  }, []);

  const items = data?.ok ? data.data.items : [];
  const error = data && !data.ok ? data.error : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Reorder advice
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">{data ? "Nothing needs restocking right now." : "Loading reorder advice…"}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/products/${item.productId}`} className="font-medium text-brand-600 hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.reason}</p>
                </div>
                <span>Order {formatNumber(item.suggestedQty, 0)}</span>
              </li>
            ))}
          </ul>
        )}
        {data?.ok && data.data.commentary ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{data.data.commentary}</p> : null}
      </CardContent>
    </Card>
  );
}
