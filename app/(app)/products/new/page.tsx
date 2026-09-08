import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { getUsdNgnRate, listCategories, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function NewProductPage() {
  const { session, allowed } = await requirePageAccess("products.write");
  if (!allowed) return <Forbidden />;
  const [categories, warehouses, usdNgnRate] = await Promise.all([
    listCategories(session.businessId),
    listWarehouses(session.businessId),
    getUsdNgnRate(session.businessId),
  ]);

  return (
    <div>
      <PageHeader title="New spare" description="Add a spare to the AAML stock register." />
      <Card>
        <CardHeader>
          <CardTitle>Spare details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm categories={categories} warehouses={warehouses.map((row) => ({ id: row.id, name: row.name }))} usdNgnRate={usdNgnRate} />
        </CardContent>
      </Card>
    </div>
  );
}
