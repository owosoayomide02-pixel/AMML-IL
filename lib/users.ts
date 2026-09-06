import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/types";

export async function attachToSoleBusiness(
  userId: string,
  options?: { role?: Role; fullName?: string; email?: string },
) {
  const admin = createAdminClient();
  const { data: businesses, error } = await admin
    .from("businesses")
    .select("id, owner_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const business = businesses?.[0];
  if (!business) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  const isOwner = business.owner_id === userId;
  const requested = options?.role;
  const role: Role = isOwner ? "owner" : requested && requested !== "owner" ? requested : "admin";

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: userId,
    business_id: business.id,
    role,
    status: "active",
    full_name: options?.fullName || profile?.full_name || "",
    email: options?.email || profile?.email || "",
  });
  if (upsertError) throw upsertError;

  return { businessId: business.id, role };
}
