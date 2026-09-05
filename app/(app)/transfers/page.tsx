import { TransferForm } from "@/components/transfers/transfer-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listProducts, listTransfers, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function TransfersPage() {
  const { session, allowed } = await requirePageAccess("transfers.read");
  if (!allowed) return <Forbidden />;
  const [transfers, warehouses, products] = await Promise.all([
    listTransfers(session.businessId),
    listWarehouses(session.businessId),
    listProducts(session.businessId),
  ]);
  const canWrite = can(session.role, "transfers.write");

  return (
    <div className="space-y-6">
      <PageHeader title="Transfers" description="Move stock between warehouses." />
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>New transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <TransferForm
              warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
              products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
            />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        {transfers.length === 0 ? (
          <EmptyState title="No transfers" description="Create a transfer when stock needs to move between locations." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Number</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </THead>
            <TBody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <Link href={`/transfers/${transfer.id}`} className="font-medium text-brand-600 hover:underline">
                      {transfer.transfer_number}
                    </Link>
                  </Td>
                  <Td>{transfer.from?.name ?? "—"}</Td>
                  <Td>{transfer.to?.name ?? "—"}</Td>
                  <Td>
                    <Badge variant={statusVariant(transfer.status)}>{humanizeStatus(transfer.status)}</Badge>
                  </Td>
                  <Td>{formatDate(transfer.created_at)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
