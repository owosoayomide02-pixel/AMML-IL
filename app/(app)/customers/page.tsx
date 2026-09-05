import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listCustomers } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import Link from "next/link";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { session, allowed } = await requirePageAccess("customers.read");
  if (!allowed) return <Forbidden />;
  const customers = await listCustomers(session.businessId, q);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and companies you sell to."
        actions={
          <>
            <SearchField placeholder="Search customers" />
            <ExportButtons
              filename="customers"
              rows={customers.map((c) => ({ Name: c.customer_name, Email: c.email, Phone: c.phone }))}
            />
            {can(session.role, "customers.write") ? (
              <Button asChild>
                <Link href="/customers/new">Add customer</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title="No customers"
            description="Add a customer to attach them to invoices."
            actionHref={can(session.role, "customers.write") ? "/customers/new" : undefined}
            actionLabel="Add customer"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
              </tr>
            </THead>
            <TBody>
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Td>
                    <Link href={`/customers/${customer.id}`} className="font-medium text-brand-600 hover:underline">
                      {customer.customer_name}
                    </Link>
                  </Td>
                  <Td>{customer.email || "—"}</Td>
                  <Td>{customer.phone || "—"}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
