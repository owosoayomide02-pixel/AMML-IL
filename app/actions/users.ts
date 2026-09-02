"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteUserSchema } from "@/schemas";
import type { Role } from "@/types";
import { revalidatePath } from "next/cache";

export async function inviteUserAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = inviteUserSchema.parse(input);
    const session = await requirePermission("users.write");
    if (data.role === "owner") return fail("Ownership cannot be transferred this way.");
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const admin = createAdminClient();
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        full_name: data.fullName,
        role: data.role,
        business_id: session.businessId,
      },
    });
    if (error) {
      if (/already been registered/i.test(error.message)) {
        return fail("A user with this email already exists.");
      }
      throw error;
    }
    if (invited.user) {
      await admin.from("profiles").upsert({
        id: invited.user.id,
        business_id: session.businessId,
        full_name: data.fullName,
        email: data.email,
        role: data.role,
        status: "invited",
      });
    }
    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "user_invited",
      entityType: "user",
      entityId: invited.user?.id,
      newValues: { email: data.email, role: data.role },
    });
    revalidatePath("/users");
    return ok(invited.user?.id ?? "");
  } catch (error) {
    logError("invite-user", error);
    return fail(getErrorMessage(error, "Unable to invite user."));
  }
}

export async function changeUserRoleAction(userId: string, role: Role): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("users.write");
    if (role === "owner" && session.role !== "owner") {
      return fail("Only the owner can assign the owner role.");
    }
    const supabase = await createClient();
    const { data: target } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .eq("business_id", session.businessId)
      .single();
    if (!target) return fail("User not found.");
    if (target.role === "owner" && session.role !== "owner") {
      return fail("You cannot change the owner role.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .eq("business_id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "user_role_changed",
      entityType: "user",
      entityId: userId,
      oldValues: { role: target.role },
      newValues: { role },
    });
    revalidatePath("/users");
    return ok(userId);
  } catch (error) {
    logError("change-role", error);
    return fail(getErrorMessage(error, "Unable to change role."));
  }
}

export async function setUserStatusAction(userId: string, status: "active" | "disabled"): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("users.write");
    if (userId === session.userId) return fail("You cannot disable your own account.");
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", userId)
      .eq("business_id", session.businessId)
      .neq("role", "owner");
    if (error) throw error;
    revalidatePath("/users");
    return ok(userId);
  } catch (error) {
    logError("set-user-status", error);
    return fail(getErrorMessage(error, "Unable to update user."));
  }
}
