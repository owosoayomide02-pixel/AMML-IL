import { SupplierForm } from "@/components/partners/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageAccess } from "@/lib/session";

export default async function NewSupplierPage() {
  const { allowed } = await requirePageAccess("suppliers.write");
  if (!allowed) return <Forbidden />;
  return (
    <div>
      <PageHeader title="New supplier" />
      <Card>
        <CardHeader>
          <CardTitle>Supplier details</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>
    </div>
  );
}
