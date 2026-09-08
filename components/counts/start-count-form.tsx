"use client";

import { startCountAction } from "@/app/actions/counts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function StartCountForm({ warehouses }: { warehouses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!warehouseId) return;
        setLoading(true);
        const result = await startCountAction(warehouseId);
        setLoading(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Count started");
        router.push(`/counts/${result.data}`);
        router.refresh();
      }}
    >
      <div className="min-w-56 flex-1">
        <Label>LOCATION</Label>
        <Select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </Select>
      </div>
      <Button loading={loading}>Start count</Button>
    </form>
  );
}
