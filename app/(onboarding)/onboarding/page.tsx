import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await requireSession();
  const supabase = await createClient();

  let step = 1;
  let categoryId: string | undefined;

  if (session.profile.business_id) {
    const [{ count: warehouses }, { data: categories }] = await Promise.all([
      supabase
        .from("warehouses")
        .select("id", { count: "exact", head: true })
        .eq("business_id", session.profile.business_id),
      supabase.from("categories").select("id").eq("business_id", session.profile.business_id).limit(1),
    ]);

    const { data: business } = await supabase
      .from("businesses")
      .select("country, onboarding_completed")
      .eq("id", session.profile.business_id)
      .single();

    if (business?.onboarding_completed) redirect("/dashboard");
    if (!business?.country) step = 2;
    else if (!warehouses) step = 3;
    else if (!categories?.[0]) step = 4;
    else {
      categoryId = categories[0].id;
      step = 5;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 dark:bg-slate-950">
      <OnboardingFlow initialStep={step} categoryId={categoryId} />
    </div>
  );
}
