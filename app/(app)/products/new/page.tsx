import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { getUsdNgnRate, listCategories } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function NewProductPage() {
  const { session, allowed } = await requirePageAccess("products.write");
  if (!allowed) return <Forbidden />;
  const [categories, usdNgnRate] = await Promise.all([
    listCategories(session.businessId),
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
          <ProductForm categories={categories} usdNgnRate={usdNgnRate} />
        </CardContent>
      </Card>
    </div>
  );
}
