import { TransferActions } from "@/components/transfers/transfer-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { getTransfer } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatNumber } from "@/lib/utils";
import type { TransferStatus } from "@/types";
import { notFound } from "next/navigation";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("transfers.read");
  if (!allowed) return <Forbidden />;
  const transfer = await getTransfer(session.businessId, id);
  if (!transfer) notFound();
  const items = (transfer.stock_transfer_items ?? []) as Array<{
    id: string;
    quantity: number;
    products: { name: string; sku: string; unit: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={transfer.transfer_number}
        description={`${transfer.from?.name ?? "Source"} → ${transfer.to?.name ?? "Destination"}`}
        actions={
          <>
            <Badge variant={statusVariant(transfer.status)}>{humanizeStatus(transfer.status)}</Badge>
            {can(session.role, "transfers.write") ? (
              <TransferActions id={transfer.id} status={transfer.status as TransferStatus} />
            ) : null}
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Product</Th>
              <Th className="text-right">Quantity</Th>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td>
                  {item.products?.name}
                  <p className="font-mono text-xs text-slate-500">{item.products?.sku}</p>
                </Td>
                <Td className="text-right">{formatNumber(item.quantity)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
