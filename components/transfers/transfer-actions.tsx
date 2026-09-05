"use client";

import { updateTransferStatusAction } from "@/app/actions/transfers";
import { Button } from "@/components/ui/button";
import type { TransferStatus } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const NEXT: Record<TransferStatus, Array<{ value: TransferStatus; label: string; danger?: boolean }>> = {
  draft: [
    { value: "pending", label: "Submit" },
    { value: "cancelled", label: "Cancel", danger: true },
  ],
  pending: [
    { value: "in_transit", label: "Ship" },
    { value: "cancelled", label: "Cancel", danger: true },
  ],
  in_transit: [
    { value: "completed", label: "Complete" },
    { value: "cancelled", label: "Cancel & return", danger: true },
  ],
  completed: [],
  cancelled: [],
};

export function TransferActions({ id, status }: { id: string; status: TransferStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <div className="flex gap-2">
      {NEXT[status].map((action) => (
        <Button
          key={action.value}
          variant={action.danger ? "danger" : "primary"}
          loading={loading === action.value}
          onClick={async () => {
            setLoading(action.value);
            const result = await updateTransferStatusAction(id, action.value);
            setLoading(null);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Transfer updated");
            router.refresh();
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
