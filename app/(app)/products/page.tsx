import { ProductBarcodeFinder } from "@/components/products/product-barcode-finder";
import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { StockSheetTable } from "@/components/stock/stock-sheet-table";
import { can } from "@/lib/permissions";
import { listProducts } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { productToStockSheetRow, toStockSheetExport } from "@/lib/stock-sheet";
import { PackagePlus } from "lucide-react";
import Link from "next/link";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("products.read");
  if (!allowed) return <Forbidden />;

  const products = await listProducts(session.businessId, { includeArchived: true, q });
  const canWrite = can(session.role, "products.write");
  const sheet = products.map((product, index) => ({ key: product.id, ...productToStockSheetRow(product, index) }));

  return (
    <div>
      <PageHeader
        title="Spares"
        description="MAKE, PART NUMBER, LOCATION, stock level, and status for every spare."
        actions={
          <>
            <SearchField placeholder="Search MAKE, PART NUMBER, or description" />
            <ProductBarcodeFinder />
            <ExportButtons filename="aaml-spares" rows={sheet.map(toStockSheetExport)} />
            {canWrite ? (
              <>
                <Button asChild variant="secondary">
                  <Link href="/products/import">Add many</Link>
                </Button>
                <Button asChild>
                  <Link href="/products/new">
                    <PackagePlus className="h-4 w-4" /> Add spare
                  </Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />
      <Card>
        {sheet.length === 0 ? (
          <EmptyState
            title="No spares yet"
            description="Add your first spare to start tracking stock and prices."
            actionHref={canWrite ? "/products/new" : undefined}
            actionLabel={canWrite ? "Add spare" : undefined}
          />
        ) : (
          <StockSheetTable rows={sheet} currency={session.business.currency} />
        )}
      </Card>
    </div>
  );
}
