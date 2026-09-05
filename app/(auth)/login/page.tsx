import { LoginForm } from "@/components/auth/login-form";
import { getSessionContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function LoginPage() {
  const session = await getSessionContext();

  if (session?.profile.status === "disabled") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } else if (session?.business) {
    redirect("/dashboard");
  } else if (session) {
    redirect("/onboarding");
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
