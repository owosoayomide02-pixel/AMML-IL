import { ExportButtons } from "@/components/export/export-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listSales } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("sales.read");
  if (!allowed) return <Forbidden />;
  const sales = await listSales(session.businessId, q);
  const currency = session.business.currency;

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Invoices and confirmed customer orders."
        actions={
          <>
            <SearchField placeholder="Search invoice or customer" />
            <ExportButtons
              filename="sales"
              rows={sales.map((sale) => ({
                Invoice: sale.invoice_number,
                Customer: (sale.customers as { customer_name?: string } | null)?.customer_name ?? "Walk-in",
                Date: sale.sale_date,
                Status: sale.status,
                Total: sale.total,
                Balance: sale.balance,
              }))}
            />
            {can(session.role, "sales.write") ? (
              <Button asChild>
                <Link href="/sales/new">New sale</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Card>
        {sales.length === 0 ? (
          <EmptyState
            title="No sales yet"
            description="Record a sale to deduct stock and produce an invoice."
            actionHref={can(session.role, "sales.write") ? "/sales/new" : undefined}
            actionLabel="New sale"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </THead>
            <TBody>
              {sales.map((sale) => (
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
                  <Td>
                    <Badge variant={statusVariant(sale.payment_status)}>{humanizeStatus(sale.payment_status)}</Badge>
                  </Td>
                  <Td className="text-right">{formatCurrency(sale.total, currency)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
