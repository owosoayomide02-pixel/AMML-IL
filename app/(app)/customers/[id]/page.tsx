import { CustomerForm } from "@/components/partners/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { getCustomer } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("customers.read");
  if (!allowed) return <Forbidden />;
  const customer = await getCustomer(session.businessId, id);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title={customer.customer_name} description={customer.email ?? undefined} />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {can(session.role, "customers.write") ? (
            <CustomerForm
              customerId={customer.id}
              defaultValues={{
                customerName: customer.customer_name,
                email: customer.email ?? "",
                phone: customer.phone ?? "",
                address: customer.address ?? "",
                notes: customer.notes ?? "",
              }}
            />
          ) : (
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd>{customer.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Address</dt>
                <dd>{customer.address || "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
