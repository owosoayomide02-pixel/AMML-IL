import { WarehouseManager } from "@/components/warehouses/warehouse-manager";
import { Card } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function WarehousesPage() {
  const { session, allowed } = await requirePageAccess("warehouses.read");
  if (!allowed) return <Forbidden />;
  const warehouses = await listWarehouses(session.businessId);

  return (
    <div>
      <PageHeader title="Warehouses" description="Locations that hold stock." />
      <Card>
        <WarehouseManager warehouses={warehouses} canWrite={can(session.role, "warehouses.write")} />
      </Card>
    </div>
  );
}
