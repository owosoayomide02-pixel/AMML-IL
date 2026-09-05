import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listSuppliers } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import Link from "next/link";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("suppliers.read");
  if (!allowed) return <Forbidden />;
  const suppliers = await listSuppliers(session.businessId, q);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors you buy from."
        actions={
          <>
            <SearchField placeholder="Search suppliers" />
            <ExportButtons
              filename="suppliers"
              rows={suppliers.map((s) => ({
                Name: s.supplier_name,
                Contact: s.contact_person,
                Email: s.email,
                Phone: s.phone,
              }))}
            />
            {can(session.role, "suppliers.write") ? (
              <Button asChild>
                <Link href="/suppliers/new">Add supplier</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Card>
        {suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers"
            description="Add a supplier to use on purchase orders."
            actionHref={can(session.role, "suppliers.write") ? "/suppliers/new" : undefined}
            actionLabel="Add supplier"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
              </tr>
            </THead>
            <TBody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <Link href={`/suppliers/${supplier.id}`} className="font-medium text-brand-600 hover:underline">
                      {supplier.supplier_name}
                    </Link>
                  </Td>
                  <Td>{supplier.contact_person || "—"}</Td>
                  <Td>{supplier.email || "—"}</Td>
                  <Td>{supplier.phone || "—"}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
