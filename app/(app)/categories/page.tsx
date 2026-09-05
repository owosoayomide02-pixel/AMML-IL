import { CategoryManager } from "@/components/categories/category-manager";
import { Card } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { listCategories } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";

export default async function CategoriesPage() {
  const { session, allowed } = await requirePageAccess("categories.read");
  if (!allowed) return <Forbidden />;
  const categories = await listCategories(session.businessId);

  return (
    <div>
      <PageHeader title="Categories" description="Group products for faster browsing and reporting." />
      <Card>
        <CategoryManager categories={categories} canWrite={can(session.role, "categories.write")} />
      </Card>
    </div>
  );
}
