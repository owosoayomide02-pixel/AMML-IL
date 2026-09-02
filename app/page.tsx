import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";

export default async function HomePage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (!session.profile.business_id) redirect("/onboarding");
  redirect("/dashboard");
}
