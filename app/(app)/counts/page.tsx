import { StartCountForm } from "@/components/counts/start-count-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listCounts, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function CountsPage() {
  const { session, allowed } = await requirePageAccess("counts.read");
  if (!allowed) return <Forbidden />;
  const [counts, warehouses] = await Promise.all([listCounts(session.businessId), listWarehouses(session.businessId)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Stock counts" description="Compare physical counts with system quantities." />
      {can(session.role, "counts.write") ? (
        <Card>
          <CardHeader>
            <CardTitle>Start a count</CardTitle>
          </CardHeader>
          <CardContent>
            <StartCountForm warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        {counts.length === 0 ? (
          <EmptyState title="No counts" description="Start a physical count to correct LOCATION stock levels." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Number</Th>
                <Th>LOCATION</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {counts.map((count) => (
                <tr key={count.id}>
                  <Td>
                    <Link href={`/counts/${count.id}`} className="font-medium text-brand-600 hover:underline">
                      {count.count_number}
                    </Link>
                  </Td>
                  <Td>{(count.warehouses as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td>{formatDate(count.count_date)}</Td>
                  <Td>
                    <Badge variant={statusVariant(count.status)}>{humanizeStatus(count.status)}</Badge>
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
