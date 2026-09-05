"use client";

import { markAllAlertsReadAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AlertActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const result = await markAllAlertsReadAction();
        setLoading(false);
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Alerts marked as read");
          router.refresh();
        }
      }}
    >
      Mark all read
    </Button>
  );
}
