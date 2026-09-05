import { ExportButtons } from "@/components/export/export-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { formatNgnUsd } from "@/lib/money";
import { can } from "@/lib/permissions";
import { getUsdNgnRate, listProducts } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatNumber, stockStatus, stockStatusLabel, toNumber } from "@/lib/utils";
import { PackagePlus } from "lucide-react";
import Link from "next/link";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("products.read");
  if (!allowed) return <Forbidden />;

  const [products, usdNgnRate] = await Promise.all([
    listProducts(session.businessId, { includeArchived: true, q }),
    getUsdNgnRate(session.businessId),
  ]);
  const canWrite = can(session.role, "products.write");

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog, pricing, and stock status for every SKU."
        actions={
          <>
            <SearchField placeholder="Search name, SKU, or barcode" />
            <ExportButtons
              filename="products"
              rows={products.map((product) => ({
                Name: product.name,
                SKU: product.sku,
                Category: product.categories?.name ?? "",
                Cost: product.cost_price,
                Selling: product.selling_price,
                Stock: product.inventory.reduce((sum, row) => sum + toNumber(row.quantity_available), 0),
                Status: product.status,
              }))}
            />
            {canWrite ? (
              <>
                <Button asChild variant="secondary">
                  <Link href="/products/import">Add many</Link>
                </Button>
                <Button asChild>
                  <Link href="/products/new">
                    <PackagePlus className="h-4 w-4" /> Add product
                  </Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />
      <Card>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add your first product to start tracking stock and prices."
            actionHref={canWrite ? "/products/new" : undefined}
            actionLabel={canWrite ? "Add product" : undefined}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Selling</Th>
                <Th className="text-right">Available</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {products.map((product) => {
                const available = product.inventory.reduce((sum, row) => sum + toNumber(row.quantity_available), 0);
                const stock = stockStatus(available, toNumber(product.minimum_stock_level));
                return (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Td>
                      <Link href={`/products/${product.id}`} className="font-medium text-brand-600 hover:underline">
                        {product.name}
                      </Link>
                      {product.brand ? <p className="text-xs text-slate-500">{product.brand}</p> : null}
                    </Td>
                    <Td className="font-mono text-xs">{product.sku}</Td>
                    <Td>{product.categories?.name ?? "—"}</Td>
                    <Td className="text-right">{formatNgnUsd(product.cost_price, usdNgnRate)}</Td>
                    <Td className="text-right">{formatNgnUsd(product.selling_price, usdNgnRate)}</Td>
                    <Td className="text-right">{formatNumber(available)}</Td>
                    <Td>
                      <Badge variant={statusVariant(stock)}>{stockStatusLabel(stock)}</Badge>
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(product.status)}>{humanizeStatus(product.status)}</Badge>
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
