import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { listAuditLogs } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export default async function AuditLogsPage() {
  const { session, allowed } = await requirePageAccess("audit.read");
  if (!allowed) return <Forbidden />;
  const logs = await listAuditLogs(session.businessId);

  return (
    <div>
      <PageHeader title="Audit logs" description="A record of important changes across the company." />
      <Card>
        {logs.length === 0 ? (
          <EmptyState title="No activity yet" description="Creates, updates, and stock movements will appear here." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
              </tr>
            </THead>
            <TBody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <Td>{formatDateTime(log.created_at)}</Td>
                  <Td>{log.profiles?.full_name || log.profiles?.email || "System"}</Td>
                  <Td>
                    <Badge>{humanizeStatus(log.action)}</Badge>
                  </Td>
                  <Td className="text-slate-500">
                    {humanizeStatus(log.entity_type)}
                    {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
