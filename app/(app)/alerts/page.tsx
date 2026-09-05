import { AnomalyScan } from "@/components/ai/anomaly-scan";
import { AlertActions } from "@/components/alerts/alert-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { syncStockAlerts } from "@/lib/alerts";
import { listAlerts } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { statusVariant } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export default async function AlertsPage() {
  const { session, allowed } = await requirePageAccess("alerts.read");
  if (!allowed) return <Forbidden />;
  await syncStockAlerts(session.businessId);
  const alerts = await listAlerts(session.businessId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Low stock, out of stock, price changes, and unusual movements. These are created from your inventory automatically."
        actions={can(session.role, "alerts.write") ? <AlertActions /> : null}
      />
      <AnomalyScan />
      <Card>
        {alerts.length === 0 ? (
          <EmptyState title="No alerts" description="You are up to date. New alerts appear when stock or prices need attention." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Severity</Th>
                <Th>Title</Th>
                <Th>When</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {alerts.map((alert) => (
                <tr key={alert.id} className={alert.is_read ? "opacity-60" : undefined}>
                  <Td>
                    <Badge variant={statusVariant(alert.severity)}>{alert.severity}</Badge>
                  </Td>
                  <Td>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-xs text-slate-500">{alert.message}</p>
                  </Td>
                  <Td>{formatDateTime(alert.created_at)}</Td>
                  <Td>{alert.is_read ? "Read" : "Unread"}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
