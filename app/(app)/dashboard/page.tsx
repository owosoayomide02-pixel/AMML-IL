import { DashboardInsights } from "@/components/ai/dashboard-insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { syncStockAlerts } from "@/lib/alerts";
import { getDashboardData } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { formatSpareOption } from "@/lib/stock-sheet";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { AlertTriangle, Bell, Boxes, Package, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { session, allowed } = await requirePageAccess("dashboard.read");
  if (!allowed) return <Forbidden />;

  await syncStockAlerts(session.businessId);
  const currency = session.business.currency;
  const data = await getDashboardData(session.businessId);
  const maxChart = Math.max(...data.chartDays.map((day) => day.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${session.business.business_name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Active spares" value={formatNumber(data.skuCount, 0)} icon={<Package className="h-5 w-5" />} />
        <StatCard
          title="Total inventory price"
          value={formatCurrency(data.onHandValue, currency)}
          hint={`Retail ${formatCurrency(data.retailValue, currency)}`}
          icon={<Boxes className="h-5 w-5" />}
        />
        <StatCard
          title="Low stock items"
          value={formatNumber(data.lowStock, 0)}
          hint={data.outOfStock ? `${data.outOfStock} out of stock` : "None out of stock"}
          tone={data.outOfStock > 0 ? "danger" : data.lowStock > 0 ? "warning" : "success"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Unread alerts"
          value={formatNumber(data.unreadAlerts, 0)}
          hint="Open the bell in the top bar"
          tone={data.unreadAlerts > 0 ? "warning" : "success"}
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          title="Sales today"
          value={formatCurrency(data.salesToday, currency)}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="success"
        />
        <StatCard title="Open purchases" value={formatNumber(data.openPurchases, 0)} icon={<Truck className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Company stock watch list</CardTitle>
          <Link href="/alerts" className="text-sm text-brand-600 hover:underline">
            Open alerts
          </Link>
        </CardHeader>
        <CardContent>
          {data.skuCount === 0 ? (
            <p className="text-sm text-slate-500">
              Add spares and receive stock to see company status. Low-stock and out-of-stock items appear here automatically.
            </p>
          ) : data.watchList.length === 0 ? (
            <p className="text-sm text-slate-500">
              All {formatNumber(data.skuCount, 0)} active spares are at or above their re-order level. No stock alerts right now.
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>MAKE</Th>
                  <Th>SPARES DESCRIPTION</Th>
                  <Th>PART NUMBER</Th>
                  <Th className="text-right">STOCK LEVEL</Th>
                  <Th className="text-right">RE-ORDER LEVEL</Th>
                  <Th>STOCK STATUS</Th>
                </tr>
              </THead>
              <TBody>
                {data.watchList.map((item) => (
                  <tr key={item.id}>
                    <Td className="whitespace-nowrap uppercase">{item.brand || "—"}</Td>
                    <Td>
                      <Link href={`/products/${item.id}`} className="font-medium text-brand-600 hover:underline">
                        {item.name}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{item.sku}</Td>
                    <Td className="text-right">{formatNumber(item.available)}</Td>
                    <Td className="text-right">{formatNumber(item.minimum)}</Td>
                    <Td>
                      <Badge variant={item.available <= 0 ? "danger" : "warning"}>
                        {item.available <= 0 ? "Out of Stock" : "Reorder needed"}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DashboardInsights />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Sales last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-1.5">
              {data.chartDays.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-brand-500/80"
                    style={{ height: `${Math.max(6, (day.total / maxChart) * 160)}px` }}
                    title={formatCurrency(day.total, currency)}
                  />
                  <span className="text-[10px] text-slate-400">{day.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500">No stock movements yet.</p>
            ) : (
              data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{formatSpareOption((tx.products as { name?: string; sku?: string; brand?: string } | null) ?? {})}</p>
                    <p className="text-xs text-slate-500">{humanizeStatus(tx.transaction_type)}</p>
                  </div>
                  <span className="tabular-nums">{formatNumber(tx.quantity)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent sales</CardTitle>
          <Link href="/sales" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </THead>
          <TBody>
            {data.recentSales.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-slate-500">
                  No sales recorded yet.
                </Td>
              </tr>
            ) : (
              data.recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <Link href={`/sales/${sale.id}`} className="font-medium text-brand-600 hover:underline">
                      {sale.invoice_number}
                    </Link>
                  </Td>
                  <Td>{(sale.customers as { customer_name?: string } | null)?.customer_name ?? "Walk-in"}</Td>
                  <Td>{formatDate(sale.sale_date)}</Td>
                  <Td>
                    <Badge variant={statusVariant(sale.status)}>{humanizeStatus(sale.status)}</Badge>
                  </Td>
                  <Td className="text-right">{formatCurrency(sale.total, currency)}</Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
