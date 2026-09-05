import { SupplierForm } from "@/components/partners/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { getSupplier } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("suppliers.read");
  if (!allowed) return <Forbidden />;
  const supplier = await getSupplier(session.businessId, id);
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={supplier.supplier_name} description={supplier.email ?? undefined} />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {can(session.role, "suppliers.write") ? (
            <SupplierForm
              supplierId={supplier.id}
              defaultValues={{
                supplierName: supplier.supplier_name,
                contactPerson: supplier.contact_person ?? "",
                email: supplier.email ?? "",
                phone: supplier.phone ?? "",
                address: supplier.address ?? "",
                city: supplier.city ?? "",
                state: supplier.state ?? "",
                country: supplier.country ?? "",
                taxNumber: supplier.tax_number ?? "",
                notes: supplier.notes ?? "",
              }}
            />
          ) : (
            <p className="text-sm text-slate-500">{supplier.phone || supplier.email || "No contact details."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
