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
import { STOCK_SHEET_LABELS } from "@/lib/stock-sheet";
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
        description={[product.brand, product.sku, product.item_code && `Item ID ${product.item_code}`].filter(Boolean).join(" · ")}
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
                  itemCode: product.item_code ?? "",
                  condition: product.condition ?? "NEW",
                  rackNumber: product.rack_number ?? "",
                  remarks: product.remarks ?? "",
                  orderStatus: product.order_status ?? "",
                }}
              />
            ) : (
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.itemId}</dt>
                  <dd>{product.item_code || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.make}</dt>
                  <dd>{product.brand || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.description}</dt>
                  <dd>{product.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.partNumber}</dt>
                  <dd>{product.sku}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.unitPrice}</dt>
                  <dd>{formatNgnUsd(product.cost_price, usdNgnRate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.condition}</dt>
                  <dd>{product.condition || "NEW"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.rackNumber}</dt>
                  <dd>{product.rack_number || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.reorderLevel}</dt>
                  <dd>{formatNumber(product.minimum_stock_level)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.remarks}</dt>
                  <dd>{product.remarks || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{STOCK_SHEET_LABELS.orderStatus}</dt>
                  <dd>{product.order_status || "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <PriceInsights productId={product.id} />
          <Card>
            <CardHeader>
              <CardTitle>{STOCK_SHEET_LABELS.location} stock</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <tr>
                  <Th>{STOCK_SHEET_LABELS.location}</Th>
                  <Th className="text-right">{STOCK_SHEET_LABELS.stockLevel}</Th>
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
                      <Td>{row.warehouses?.name ?? "Location"}</Td>
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
