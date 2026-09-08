import { BulkStockImport } from "@/components/products/bulk-stock-import";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function BulkImportPage() {
  const { session, allowed } = await requirePageAccess("products.write");
  if (!allowed) return <Forbidden />;
  const warehouses = await listWarehouses(session.businessId);

  return (
    <div>
      <PageHeader
        title="Add stock in bulk"
        description="Paste a list or upload the AAML Excel sheet (MAKE, SPARES DESCRIPTION, PART NUMBER, STOCK LEVEL)."
      />
      {warehouses.length === 0 ? (
        <p className="text-sm text-slate-500">Create a LOCATION first, then come back to import stock.</p>
      ) : (
        <BulkStockImport warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))} />
      )}
    </div>
  );
}
