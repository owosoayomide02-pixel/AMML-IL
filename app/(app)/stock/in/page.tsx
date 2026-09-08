import { StockInForm } from "@/components/stock/stock-in-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { listProducts, listStockTransactions, listSuppliers, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function StockInPage() {
  const { session, allowed } = await requirePageAccess("stock.in");
  if (!allowed) return <Forbidden />;

  const [products, warehouses, suppliers, transactions] = await Promise.all([
    listProducts(session.businessId),
    listWarehouses(session.businessId),
    listSuppliers(session.businessId),
    listStockTransactions(session.businessId, 20),
  ]);

  const inbound = transactions.filter((tx) =>
    ["opening_stock", "stock_in", "return_in", "purchase", "adjustment_in", "transfer_in"].includes(tx.transaction_type),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock in"
        description="Receive inventory into a LOCATION."
        actions={
          <Button asChild variant="secondary">
            <Link href="/products/import">Add many at once</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Record inbound stock</CardTitle>
        </CardHeader>
        <CardContent>
          <StockInForm
            products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, brand: p.brand }))}
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.supplier_name }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent inbound movements</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>When</Th>
              <Th>MAKE</Th>
              <Th>SPARES DESCRIPTION</Th>
              <Th>PART NUMBER</Th>
              <Th>LOCATION</Th>
              <Th>Type</Th>
              <Th className="text-right">STOCK LEVEL</Th>
            </tr>
          </THead>
          <TBody>
            {inbound.map((tx) => (
              <tr key={tx.id}>
                <Td>{formatDateTime(tx.created_at)}</Td>
                <Td className="whitespace-nowrap uppercase">{(tx.products as { brand?: string } | null)?.brand || "—"}</Td>
                <Td>{(tx.products as { name?: string } | null)?.name ?? "—"}</Td>
                <Td className="font-mono text-xs">{(tx.products as { sku?: string } | null)?.sku ?? "—"}</Td>
                <Td>{(tx.warehouses as { name?: string } | null)?.name ?? "—"}</Td>
                <Td>
                  <Badge variant={statusVariant("info")}>{humanizeStatus(tx.transaction_type)}</Badge>
                </Td>
                <Td className="text-right">{formatNumber(tx.quantity)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
