import { ReorderAdvice } from "@/components/ai/reorder-advice";
import { ExportButtons } from "@/components/export/export-buttons";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { StockSheetTable } from "@/components/stock/stock-sheet-table";
import { listInventory } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { toStockSheetExport, toStockSheetRow } from "@/lib/stock-sheet";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("inventory.read");
  if (!allowed) return <Forbidden />;

  const rows = await listInventory(session.businessId, q);
  const sheet = rows.map((row, index) => ({ key: row.id, ...toStockSheetRow(row, index) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock overview"
        description="Spares register in the AAML inventory sheet format."
        actions={
          <>
            <SearchField placeholder="Search MAKE, PART NUMBER, or LOCATION" />
            <ExportButtons filename="aaml-inventory" rows={sheet.map(toStockSheetExport)} />
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
          <StockSheetTable rows={sheet} currency={session.business.currency} />
        )}
      </Card>
    </div>
  );
}
