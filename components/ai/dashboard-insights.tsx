"use client";

import { getDashboardInsightsAction } from "@/app/actions/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function DashboardInsights() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardInsightsAction>> | null>(null);

  useEffect(() => {
    void getDashboardInsightsAction().then(setData);
  }, []);

  const payload = data?.ok ? data.data : null;
  const items = payload?.reorder.items ?? [];
  const error = data && !data.ok ? data.error : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            Reorder advice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No items are at or below minimum stock. This list updates from live inventory, even if the AI model is offline.</p>
          ) : (
            items.slice(0, 5).map((item) => (
              <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <Link href={`/products/${item.productId}`} className="font-medium text-brand-600 hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.reason}</p>
                </div>
                <span className="shrink-0 tabular-nums">+{formatNumber(item.suggestedQty, 0)}</span>
              </div>
            ))
          )}
          {payload?.reorder.commentary ? <p className="text-sm text-slate-600 dark:text-slate-300">{payload.reorder.commentary}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            Demand outlook
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          ) : payload?.demand ? (
            <div className="space-y-2 text-sm">
              <p>
                Last 14 days: <strong>{formatNumber(payload.demand.last14Qty)}</strong> units sold
                {payload.demand.changePct !== 0 ? ` (${payload.demand.changePct > 0 ? "+" : ""}${payload.demand.changePct}% vs prior period)` : ""}.
              </p>
              <p>
                Next 14 days (simple projection): <strong>{formatNumber(payload.demand.projected14Qty)}</strong> units.
              </p>
              {payload.demand.commentary ? <p className="text-slate-600 dark:text-slate-300">{payload.demand.commentary}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{data ? "Sales trend appears here once invoices are recorded." : "Loading outlook…"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
