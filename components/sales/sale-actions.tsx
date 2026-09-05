"use client";

import { cancelSaleAction } from "@/app/actions/sales";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function SaleActions({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Cancel sale
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this sale?"
        description="Confirmed sales return stock to the warehouse. This cannot be undone."
        confirmLabel="Cancel sale"
        danger
        loading={loading}
        onConfirm={async () => {
          setLoading(true);
          const result = await cancelSaleAction(id);
          setLoading(false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Sale cancelled");
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
