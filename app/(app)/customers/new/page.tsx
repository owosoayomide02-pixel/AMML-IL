import { CustomerForm } from "@/components/partners/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageAccess } from "@/lib/session";

export default async function NewCustomerPage() {
  const { allowed } = await requirePageAccess("customers.write");
  if (!allowed) return <Forbidden />;
  return (
    <div>
      <PageHeader title="New customer" />
      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
