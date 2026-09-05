"use client";

import { receivePurchaseAction } from "@/app/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ReceiveForm({
  purchaseId,
  items,
}: {
  purchaseId: string;
  items: Array<{ itemId: string; name: string; remaining: number }>;
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(items.map((item) => [item.itemId, item.remaining])),
  );
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        const result = await receivePurchaseAction({
          purchaseId,
          items: items.map((item) => ({ itemId: item.itemId, quantity: Number(quantities[item.itemId] ?? 0) })),
        });
        setLoading(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Goods received");
        router.refresh();
      }}
    >
      {items.map((item) => (
        <div key={item.itemId}>
          <Label>
            {item.name} <span className="font-normal text-slate-500">(remaining {item.remaining})</span>
          </Label>
          <Input
            type="number"
            min={0}
            max={item.remaining}
            step="0.01"
            value={quantities[item.itemId] ?? 0}
            onChange={(event) => setQuantities((current) => ({ ...current, [item.itemId]: Number(event.target.value) }))}
          />
        </div>
      ))}
      <Button loading={loading}>Receive selected quantities</Button>
    </form>
  );
}
