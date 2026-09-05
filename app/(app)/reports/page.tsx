import { DemandForecast } from "@/components/ai/demand-forecast";
import { ExportButtons } from "@/components/export/export-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { getReportData } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { formatCurrency, formatNumber, toNumber } from "@/lib/utils";

export default async function ReportsPage() {
  const { session, allowed } = await requirePageAccess("reports.read");
  if (!allowed) return <Forbidden />;
  const data = await getReportData(session.businessId);
  const currency = session.business.currency;
  const salesTotal = data.sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const purchaseTotal = data.purchases.reduce((sum, purchase) => sum + toNumber(purchase.total), 0);
  const stockValue = data.inventory.reduce(
    (sum, row) => sum + toNumber(row.quantity_on_hand) * toNumber(row.products?.cost_price),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Last 90 days of sales, purchases, and stock value."
        actions={
          <ExportButtons
            filename="inventory-report"
            rows={data.inventory.map((row) => ({
              Product: row.products?.name,
              SKU: row.products?.sku,
              Warehouse: row.warehouses?.name,
              OnHand: row.quantity_on_hand,
              Value: toNumber(row.quantity_on_hand) * toNumber(row.products?.cost_price),
            }))}
          />
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Sales (90 days)</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(salesTotal, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Purchases (90 days)</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(purchaseTotal, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">Current stock value</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(stockValue, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <DemandForecast />
      <Card>
        <CardHeader>
          <CardTitle>Top products by revenue</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th className="text-right">Qty sold</Th>
              <Th className="text-right">Revenue</Th>
            </tr>
          </THead>
          <TBody>
            {data.topProducts.length === 0 ? (
              <tr>
                <Td colSpan={4} className="text-slate-500">
                  No sales in this period.
                </Td>
              </tr>
            ) : (
              data.topProducts.map((product) => (
                <tr key={product.sku || product.name}>
                  <Td>{product.name}</Td>
                  <Td className="font-mono text-xs">{product.sku}</Td>
                  <Td className="text-right">{formatNumber(product.qty)}</Td>
                  <Td className="text-right">{formatCurrency(product.revenue, currency)}</Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
