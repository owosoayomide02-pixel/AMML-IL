import { PurchaseActions } from "@/components/purchases/purchase-actions";
import { ReceiveForm } from "@/components/purchases/receive-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { getPurchase } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("purchases.read");
  if (!allowed) return <Forbidden />;
  const purchase = await getPurchase(session.businessId, id);
  if (!purchase) notFound();
  const currency = session.business.currency;
  const items = (purchase.purchase_items ?? []) as Array<{
    id: string;
    quantity: number;
    received_quantity: number;
    cost_price: number;
    total: number;
    products: { name: string; sku: string } | null;
    warehouses: { name: string } | null;
  }>;
  const canReceive =
    can(session.role, "purchases.receive") &&
    ["ordered", "partially_received"].includes(purchase.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchase.purchase_number}
        description={`${(purchase.suppliers as { supplier_name?: string } | null)?.supplier_name ?? "Supplier"} · ${formatDate(purchase.purchase_date)}`}
        actions={
          <>
            <Badge variant={statusVariant(purchase.status)}>{humanizeStatus(purchase.status)}</Badge>
            {can(session.role, "purchases.write") ? (
              <PurchaseActions id={purchase.id} status={purchase.status} />
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(purchase.total, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Paid</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(purchase.amount_paid, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Balance</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(purchase.balance, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Product</Th>
              <Th>Warehouse</Th>
              <Th className="text-right">Ordered</Th>
              <Th className="text-right">Received</Th>
              <Th className="text-right">Cost</Th>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td>{item.products?.name}</Td>
                <Td>{item.warehouses?.name}</Td>
                <Td className="text-right">{formatNumber(item.quantity)}</Td>
                <Td className="text-right">{formatNumber(item.received_quantity)}</Td>
                <Td className="text-right">{formatCurrency(item.cost_price, currency)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
      {canReceive ? (
        <Card>
          <CardHeader>
            <CardTitle>Receive goods</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceiveForm
              purchaseId={purchase.id}
              items={items.map((item) => ({
                itemId: item.id,
                name: item.products?.name ?? "Item",
                remaining: Number(item.quantity) - Number(item.received_quantity),
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
