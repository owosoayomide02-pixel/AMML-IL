import { ReorderAdvice } from "@/components/ai/reorder-advice";
import { ExportButtons } from "@/components/export/export-buttons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { listInventory } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { statusVariant } from "@/lib/status";
import { formatCurrency, formatNumber, stockStatus, stockStatusLabel, toNumber } from "@/lib/utils";
import Link from "next/link";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("inventory.read");
  if (!allowed) return <Forbidden />;

  const rows = await listInventory(session.businessId, q);
  const currency = session.business.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        description="On-hand quantities across every warehouse."
        actions={
          <>
            <SearchField placeholder="Search product or warehouse" />
            <ExportButtons
              filename="inventory"
              rows={rows.map((row) => ({
                Product: row.products?.name,
                SKU: row.products?.sku,
                Warehouse: row.warehouses?.name,
                OnHand: row.quantity_on_hand,
                Reserved: row.quantity_reserved,
                Available: row.quantity_available,
                Value: toNumber(row.quantity_on_hand) * toNumber(row.products?.cost_price),
              }))}
            />
          </>
        }
      />
      <ReorderAdvice />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No stock records"
            description="Receive a purchase or record a stock-in movement to populate this view."
            actionHref="/stock/in"
            actionLabel="Record stock in"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Product</Th>
                <Th>Warehouse</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Value</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => {
                const available = toNumber(row.quantity_available);
                const stock = stockStatus(available, toNumber(row.products?.minimum_stock_level));
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Td>
                      <Link href={`/products/${row.product_id}`} className="font-medium text-brand-600 hover:underline">
                        {row.products?.name ?? "Product"}
                      </Link>
                      <p className="font-mono text-xs text-slate-500">{row.products?.sku}</p>
                    </Td>
                    <Td>{row.warehouses?.name ?? "—"}</Td>
                    <Td className="text-right">{formatNumber(row.quantity_on_hand)}</Td>
                    <Td className="text-right">{formatNumber(row.quantity_reserved)}</Td>
                    <Td className="text-right">{formatNumber(available)}</Td>
                    <Td className="text-right">
                      {formatCurrency(toNumber(row.quantity_on_hand) * toNumber(row.products?.cost_price), currency)}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(stock)}>{stockStatusLabel(stock)}</Badge>
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
