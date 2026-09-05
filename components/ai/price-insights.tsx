"use client";

import { getPriceInsightsAction } from "@/app/actions/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNgnUsd } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function PriceInsights({ productId }: { productId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getPriceInsightsAction>> | null>(null);

  useEffect(() => {
    void getPriceInsightsAction(productId).then(setData);
  }, [productId]);

  const insight = data?.ok ? data.data : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Price insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!insight ? (
          <p className="text-slate-500">{data && !data.ok ? data.error : "Loading insights…"}</p>
        ) : (
          <>
            <p>
              Margin <strong>{(insight.margin * 100).toFixed(1)}%</strong>. Suggested selling price{" "}
              <strong>{formatNgnUsd(insight.suggested)}</strong> at a 30% target.
            </p>
            {insight.flags.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-amber-700 dark:text-amber-300">
                {insight.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No price warnings on this SKU.</p>
            )}
            {insight.commentary ? <p className="text-slate-600 dark:text-slate-300">{insight.commentary}</p> : null}
            {insight.history.length > 1 ? (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Recent changes</p>
                <ul className="space-y-1 text-xs text-slate-500">
                  {insight.history.slice(0, 5).map((row) => (
                    <li key={row.created_at}>
                      {formatDate(row.created_at)} · cost {formatNgnUsd(row.cost_price)} · sell {formatNgnUsd(row.selling_price)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
