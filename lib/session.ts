import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { assertCan, can, type Permission } from "@/lib/permissions";
import type { Business, Profile, Role, SessionContext } from "@/types";
import { attachToSoleBusiness } from "@/lib/users";

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? "",
        full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
        role: "owner",
        status: "active",
      })
      .select("*")
      .maybeSingle();
    profile = created;
  }

  if (!profile) return null;

  if (!profile.business_id) {
    try {
      const joined = await attachToSoleBusiness(user.id, {
        email: user.email ?? profile.email,
        fullName: profile.full_name,
      });
      if (joined) {
        profile = { ...profile, business_id: joined.businessId, role: joined.role, status: "active" };
      }
    } catch {
      // Leave the user on onboarding when no company exists yet.
    }
  }

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
  if (!session) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.signOut();
    }
    redirect("/login");
  }
  return session;
}

export async function requireBusiness() {
  const session = await requireSession();
  if (!session.business || !session.profile.business_id) {
    redirect("/onboarding");
  }
  if (session.profile.status === "disabled") {
    const supabase = await createClient();
    await supabase.auth.signOut();
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
