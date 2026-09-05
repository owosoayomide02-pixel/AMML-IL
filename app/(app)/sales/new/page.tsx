import { SaleForm } from "@/components/sales/sale-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { listCustomers, listProducts, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function NewSalePage() {
  const { session, allowed } = await requirePageAccess("sales.write");
  if (!allowed) return <Forbidden />;
  const [products, warehouses, customers] = await Promise.all([
    listProducts(session.businessId),
    listWarehouses(session.businessId),
    listCustomers(session.businessId),
  ]);

  return (
    <div>
      <PageHeader title="New sale" description="Confirming a sale deducts stock immediately." />
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <SaleForm
            currency={session.business.currency}
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              sellingPrice: Number(p.selling_price),
            }))}
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            customers={customers.map((c) => ({ id: c.id, name: c.customer_name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
