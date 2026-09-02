import { AppShell } from "@/components/layout/app-shell";
import { requireBusiness } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBusiness();
  const supabase = await createClient();
  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", session.businessId)
    .eq("is_read", false);

  return (
    <AppShell profile={session.profile} unreadAlerts={count ?? 0}>
      {children}
    </AppShell>
  );
}
