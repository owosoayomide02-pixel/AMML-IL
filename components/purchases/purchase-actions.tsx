"use client";

import { updatePurchaseStatusAction } from "@/app/actions/purchases";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PurchaseActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"ordered" | "cancelled" | null>(null);

  async function change(next: "ordered" | "cancelled") {
    setLoading(next);
    const result = await updatePurchaseStatusAction(id, next);
    setLoading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(next === "ordered" ? "Purchase ordered" : "Purchase cancelled");
    router.refresh();
  }

  if (status === "received" || status === "cancelled") return null;

  return (
    <div className="flex gap-2">
      {status === "draft" ? (
        <Button loading={loading === "ordered"} onClick={() => void change("ordered")}>
          Mark ordered
        </Button>
      ) : null}
      <Button variant="danger" loading={loading === "cancelled"} onClick={() => void change("cancelled")}>
        Cancel
      </Button>
    </div>
  );
}
