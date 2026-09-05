import { CountForm } from "@/components/counts/count-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { getCount } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function CountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed } = await requirePageAccess("counts.read");
  if (!allowed) return <Forbidden />;
  const count = await getCount(session.businessId, id);
  if (!count) notFound();
  const items = (count.inventory_count_items ?? []) as Array<{
    id: string;
    product_id: string;
    system_quantity: number;
    counted_quantity: number | null;
    variance: number | null;
    reason: string | null;
    products: { name: string; sku: string; unit: string } | null;
  }>;

  return (
    <div>
      <PageHeader
        title={count.count_number}
        description={`${(count.warehouses as { name?: string } | null)?.name ?? "Warehouse"} · ${formatDate(count.count_date)}`}
        actions={<Badge variant={statusVariant(count.status)}>{humanizeStatus(count.status)}</Badge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Counted quantities</CardTitle>
        </CardHeader>
        <CardContent>
          <CountForm
            countId={count.id}
            status={count.status}
            canWrite={can(session.role, "counts.write")}
            canApprove={can(session.role, "counts.approve")}
            items={items}
          />
        </CardContent>
      </Card>
    </div>
  );
}
