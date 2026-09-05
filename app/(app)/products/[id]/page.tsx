import { PriceInsights } from "@/components/ai/price-insights";
import { ProductActions } from "@/components/products/product-actions";
import { ProductForm } from "@/components/products/product-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { formatNgnUsd } from "@/lib/money";
import { getProduct, getUsdNgnRate, listCategories } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatNumber, toNumber } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("products.read");
  if (!allowed) return <Forbidden />;

  const [product, categories, usdNgnRate] = await Promise.all([
    getProduct(session.businessId, id),
    listCategories(session.businessId),
    getUsdNgnRate(session.businessId),
  ]);
  if (!product) notFound();
  const canWrite = can(session.role, "products.write");

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.sku}${product.barcode ? ` · ${product.barcode}` : ""}`}
        actions={
          canWrite ? (
            <ProductActions id={product.id} archived={product.status === "archived"} />
          ) : (
            <Badge variant={statusVariant(product.status)}>{humanizeStatus(product.status)}</Badge>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {canWrite ? (
              <ProductForm
                productId={product.id}
                categories={categories}
                usdNgnRate={usdNgnRate}
                defaultValues={{
                  name: product.name,
                  sku: product.sku,
                  barcode: product.barcode ?? "",
                  categoryId: product.category_id ?? "",
                  brand: product.brand ?? "",
                  manufacturer: product.manufacturer ?? "",
                  description: product.description ?? "",
                  unit: product.unit,
                  costPrice: toNumber(product.cost_price),
                  sellingPrice: toNumber(product.selling_price),
                  minimumStockLevel: toNumber(product.minimum_stock_level),
                  reorderQuantity: toNumber(product.reorder_quantity),
                  imageUrl: product.image_url ?? "",
                }}
              />
            ) : (
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd>{product.categories?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Unit</dt>
                  <dd>{product.unit}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cost</dt>
                  <dd>{formatNgnUsd(product.cost_price, usdNgnRate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Selling</dt>
                  <dd>{formatNgnUsd(product.selling_price, usdNgnRate)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <PriceInsights productId={product.id} />
          <Card>
            <CardHeader>
              <CardTitle>Warehouse stock</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <tr>
                  <Th>Warehouse</Th>
                  <Th className="text-right">On hand</Th>
                  <Th className="text-right">Available</Th>
                </tr>
              </THead>
              <TBody>
                {product.inventory.length === 0 ? (
                  <tr>
                    <Td colSpan={3} className="text-slate-500">
                      No stock recorded.
                    </Td>
                  </tr>
                ) : (
                  product.inventory.map((row) => (
                    <tr key={row.id}>
                      <Td>{row.warehouses?.name ?? "Warehouse"}</Td>
                      <Td className="text-right">{formatNumber(row.quantity_on_hand)}</Td>
                      <Td className="text-right">{formatNumber(row.quantity_available)}</Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
