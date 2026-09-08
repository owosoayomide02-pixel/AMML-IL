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
import { toStockSheetRow } from "@/lib/stock-sheet";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("inventory.read");
  if (!allowed) return <Forbidden />;

  const rows = await listInventory(session.businessId, q);
  const currency = session.business.currency;
  const sheet = rows.map((row, index) => ({ key: row.id, ...toStockSheetRow(row, index) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        description="Spares register: make, part number, location, rack, and stock status."
        actions={
          <>
            <SearchField placeholder="Search make, part number, or location" />
            <ExportButtons
              filename="aaml-inventory"
              rows={sheet.map((row) => ({
                "Item ID": row.itemId,
                MAKE: row.make,
                "SPARES DESCRIPTION": row.description,
                "PART NUMBER": row.partNumber,
                "UNIT PRICE": row.unitPrice,
                CONDITION: row.condition,
                LOCATION: row.location,
                "RACK NUMBER": row.rackNumber === "—" ? "" : row.rackNumber,
                "STOCK LEVEL": row.stockLevel,
                "RE-ORDER LEVEL": row.reorderLevel,
                "TOTAL INVENTORY PRICE": row.totalPrice,
                "STOCK STATUS": row.stockStatusLabel,
                REMARKS: row.remarks,
                "ORDER STATUS": row.orderStatus === "—" ? "" : row.orderStatus,
              }))}
            />
          </>
        }
      />
      <ReorderAdvice />
      <Card>
        {sheet.length === 0 ? (
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
                <Th className="whitespace-nowrap">Item ID</Th>
                <Th className="whitespace-nowrap">Make</Th>
                <Th>Spares description</Th>
                <Th className="whitespace-nowrap">Part number</Th>
                <Th className="whitespace-nowrap text-right">Unit price</Th>
                <Th className="whitespace-nowrap">Condition</Th>
                <Th className="whitespace-nowrap">Location</Th>
                <Th className="whitespace-nowrap">Rack number</Th>
                <Th className="whitespace-nowrap text-right">Stock level</Th>
                <Th className="whitespace-nowrap text-right">Re-order level</Th>
                <Th className="whitespace-nowrap text-right">Total inventory price</Th>
                <Th className="whitespace-nowrap">Stock status</Th>
                <Th className="whitespace-nowrap">Remarks</Th>
                <Th className="whitespace-nowrap">Order status</Th>
              </tr>
            </THead>
            <TBody>
              {sheet.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td className="whitespace-nowrap font-mono text-xs">{row.itemId}</Td>
                  <Td className="whitespace-nowrap font-medium uppercase">{row.make}</Td>
                  <Td className="min-w-[16rem]">
                    {row.productId ? (
                      <Link href={`/products/${row.productId}`} className="font-medium text-brand-600 hover:underline">
                        {row.description}
                      </Link>
                    ) : (
                      row.description
                    )}
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{row.partNumber}</Td>
                  <Td className="whitespace-nowrap text-right">{formatCurrency(row.unitPrice, currency)}</Td>
                  <Td className="whitespace-nowrap uppercase">{row.condition}</Td>
                  <Td className="whitespace-nowrap uppercase">{row.location}</Td>
                  <Td className="whitespace-nowrap">{row.rackNumber}</Td>
                  <Td className="whitespace-nowrap text-right">{formatNumber(row.stockLevel)}</Td>
                  <Td className="whitespace-nowrap text-right">{formatNumber(row.reorderLevel)}</Td>
                  <Td className="whitespace-nowrap text-right">{formatCurrency(row.totalPrice, currency)}</Td>
                  <Td className="whitespace-nowrap">
                    <Badge variant={statusVariant(row.stockStatus)}>{row.stockStatusLabel}</Badge>
                  </Td>
                  <Td className="min-w-[9rem]">{row.remarks}</Td>
                  <Td className="whitespace-nowrap">{row.orderStatus}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
