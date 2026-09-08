"use client";

import { archiveProductAction, restoreProductAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ProductActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant={archived ? "secondary" : "outline"}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const result = archived ? await restoreProductAction(id) : await archiveProductAction(id);
        setLoading(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(archived ? "Spare restored" : "Spare archived");
        router.refresh();
      }}
    >
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
