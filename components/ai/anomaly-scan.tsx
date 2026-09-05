"use client";

import { scanAnomaliesAction } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AnomalyScan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Anomaly scan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Check for out-of-stock items, large adjustments, and sudden price changes. AI commentary is used when a key is configured.
        </p>
        <Button
          loading={loading}
          onClick={async () => {
            setLoading(true);
            const result = await scanAnomaliesAction();
            setLoading(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(result.data.created ? `${result.data.created} new alert${result.data.created === 1 ? "" : "s"}` : "No new anomalies");
            router.refresh();
          }}
        >
          Run scan
        </Button>
      </CardContent>
    </Card>
  );
}
