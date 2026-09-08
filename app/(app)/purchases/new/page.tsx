import { PurchaseForm } from "@/components/purchases/purchase-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { listProducts, listSuppliers, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function NewPurchasePage() {
  const { session, allowed } = await requirePageAccess("purchases.write");
  if (!allowed) return <Forbidden />;
  const [products, warehouses, suppliers] = await Promise.all([
    listProducts(session.businessId),
    listWarehouses(session.businessId),
    listSuppliers(session.businessId),
  ]);

  return (
    <div>
      <PageHeader title="New purchase" description="Draft or order stock from a supplier." />
      <Card>
        <CardHeader>
          <CardTitle>Purchase order</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseForm
            currency={session.business.currency}
            products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, brand: p.brand, costPrice: Number(p.cost_price) }))}
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.supplier_name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
