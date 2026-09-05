import { StockOutForm } from "@/components/stock/stock-out-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { listProducts, listStockTransactions, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus } from "@/lib/status";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function StockOutPage() {
  const { session, allowed } = await requirePageAccess("stock.out");
  if (!allowed) return <Forbidden />;

  const [products, warehouses, transactions] = await Promise.all([
    listProducts(session.businessId),
    listWarehouses(session.businessId),
    listStockTransactions(session.businessId, 20),
  ]);
  const outbound = transactions.filter((tx) =>
    ["stock_out", "sale", "damaged", "expired", "return_out", "adjustment_out", "transfer_out"].includes(tx.transaction_type),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Stock out" description="Issue, damage, or expire inventory from a warehouse." />
      <Card>
        <CardHeader>
          <CardTitle>Record outbound stock</CardTitle>
        </CardHeader>
        <CardContent>
          <StockOutForm
            products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent outbound movements</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>When</Th>
              <Th>Product</Th>
              <Th>Type</Th>
              <Th className="text-right">Qty</Th>
            </tr>
          </THead>
          <TBody>
            {outbound.map((tx) => (
              <tr key={tx.id}>
                <Td>{formatDateTime(tx.created_at)}</Td>
                <Td>{(tx.products as { name?: string } | null)?.name ?? "—"}</Td>
                <Td>{humanizeStatus(tx.transaction_type)}</Td>
                <Td className="text-right">{formatNumber(tx.quantity)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
