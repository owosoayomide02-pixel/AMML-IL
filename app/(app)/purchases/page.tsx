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
import { listPurchases } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("purchases.read");
  if (!allowed) return <Forbidden />;
  const purchases = await listPurchases(session.businessId, q);
  const currency = session.business.currency;

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Order goods and receive them into stock."
        actions={
          <>
            <SearchField placeholder="Search PO or supplier" />
            <ExportButtons
              filename="purchases"
              rows={purchases.map((purchase) => ({
                Number: purchase.purchase_number,
                Supplier: (purchase.suppliers as { supplier_name?: string } | null)?.supplier_name ?? "",
                Date: purchase.purchase_date,
                Status: purchase.status,
                Total: purchase.total,
              }))}
            />
            {can(session.role, "purchases.write") ? (
              <Button asChild>
                <Link href="/purchases/new">New purchase</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Card>
        {purchases.length === 0 ? (
          <EmptyState
            title="No purchase orders"
            description="Create a purchase order when you need to restock from a supplier."
            actionHref={can(session.role, "purchases.write") ? "/purchases/new" : undefined}
            actionLabel="New purchase"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>PO</Th>
                <Th>Supplier</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </THead>
            <TBody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <Link href={`/purchases/${purchase.id}`} className="font-medium text-brand-600 hover:underline">
                      {purchase.purchase_number}
                    </Link>
                  </Td>
                  <Td>{(purchase.suppliers as { supplier_name?: string } | null)?.supplier_name ?? "—"}</Td>
                  <Td>{formatDate(purchase.purchase_date)}</Td>
                  <Td>
                    <Badge variant={statusVariant(purchase.status)}>{humanizeStatus(purchase.status)}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(purchase.payment_status)}>{humanizeStatus(purchase.payment_status)}</Badge>
                  </Td>
                  <Td className="text-right">{formatCurrency(purchase.total, currency)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
