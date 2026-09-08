import { SaleActions } from "@/components/sales/sale-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { getSale } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("sales.read");
  if (!allowed) return <Forbidden />;
  const sale = await getSale(session.businessId, id);
  if (!sale) notFound();
  const currency = session.business.currency;
  const items = (sale.sale_items ?? []) as Array<{
    id: string;
    quantity: number;
    selling_price: number;
    discount: number;
    tax: number;
    total: number;
    products: { name: string; sku: string; brand?: string | null; unit: string } | null;
    warehouses: { name: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={sale.invoice_number}
        description={`${(sale.customers as { customer_name?: string } | null)?.customer_name ?? "Walk-in"} · ${formatDate(sale.sale_date)}`}
        actions={
          <>
            <Badge variant={statusVariant(sale.status)}>{humanizeStatus(sale.status)}</Badge>
            {can(session.role, "sales.write") && sale.status !== "cancelled" ? <SaleActions id={sale.id} /> : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(sale.total, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Paid</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(sale.amount_paid, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Balance</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(sale.balance, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>MAKE</Th>
              <Th>SPARES DESCRIPTION</Th>
              <Th>PART NUMBER</Th>
              <Th>LOCATION</Th>
              <Th className="text-right">STOCK LEVEL</Th>
              <Th className="text-right">UNIT PRICE</Th>
              <Th className="text-right">TOTAL INVENTORY PRICE</Th>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td className="whitespace-nowrap uppercase">{item.products?.brand || "—"}</Td>
                <Td className="font-medium">{item.products?.name}</Td>
                <Td className="font-mono text-xs">{item.products?.sku}</Td>
                <Td>{item.warehouses?.name}</Td>
                <Td className="text-right">{formatNumber(item.quantity)}</Td>
                <Td className="text-right">{formatCurrency(item.selling_price, currency)}</Td>
                <Td className="text-right">{formatCurrency(item.total, currency)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
      {sale.notes ? <p className="text-sm text-slate-500">Notes: {sale.notes}</p> : null}
    </div>
  );
}
