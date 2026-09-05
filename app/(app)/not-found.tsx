import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <Card>
      <EmptyState
        title="Page not found"
        description="That screen does not exist. Use the sidebar to return to inventory."
        actionHref="/dashboard"
        actionLabel="Go to dashboard"
      />
    </Card>
  );
}
