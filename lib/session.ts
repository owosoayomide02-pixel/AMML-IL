import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { assertCan, can, type Permission } from "@/lib/permissions";
import type { Business, Profile, Role, SessionContext } from "@/types";

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  let business: Business | null = null;
  if (profile.business_id) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .maybeSingle();
    business = data as Business | null;
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile: profile as Profile,
    business,
    role: profile.role as Role,
  };
}

export async function requireSession() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  return session;
}

export async function requireBusiness() {
  const session = await requireSession();
  if (!session.business || !session.profile.business_id) {
    redirect("/onboarding");
  }
  if (session.profile.status === "disabled") {
    redirect("/login?error=disabled");
  }
  return {
    ...session,
    business: session.business,
    businessId: session.profile.business_id,
  };
}

export async function requirePermission(permission: Permission) {
  const session = await requireBusiness();
  assertCan(session.role, permission);
  return session;
}

export function requireBusinessId(session: SessionContext) {
  if (!session.profile.business_id) {
    throw new AppError("Complete onboarding before continuing.", "NO_BUSINESS");
  }
  return session.profile.business_id;
}

export async function requirePageAccess(permission: Permission) {
  const session = await requireBusiness();
  return {
    session,
    allowed: can(session.role, permission),
  };
}
