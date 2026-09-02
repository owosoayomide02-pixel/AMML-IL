import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";

export function Forbidden() {
  return (
    <Card>
      <EmptyState
        icon={<ShieldAlert className="h-10 w-10" />}
        title="You do not have access"
        description="Your role does not include permission for this section. Ask an administrator if you need access."
      />
    </Card>
  );
}
