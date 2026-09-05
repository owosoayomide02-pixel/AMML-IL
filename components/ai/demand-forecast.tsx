"use client";

import { getDemandForecastAction } from "@/app/actions/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function DemandForecast() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDemandForecastAction>> | null>(null);

  useEffect(() => {
    void getDemandForecastAction().then(setData);
  }, []);

  const forecast = data?.ok ? data.data : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Demand / sales trend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!forecast ? (
          <p className="text-slate-500">{data && !data.ok ? data.error : "Loading forecast…"}</p>
        ) : (
          <>
            <p>
              Last 14 days sold <strong>{formatNumber(forecast.last14Qty)}</strong> units (
              {formatCurrency(forecast.last14Revenue)}). Trend is <strong>{forecast.trend}</strong>
              {forecast.changePct ? ` (${forecast.changePct > 0 ? "+" : ""}${forecast.changePct}%)` : ""}.
            </p>
            <p>
              Simple next-14-day projection: <strong>{formatNumber(forecast.projected14Qty)}</strong> units.
            </p>
            {forecast.commentary ? <p className="text-slate-600 dark:text-slate-300">{forecast.commentary}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
