"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { attachToSoleBusiness } from "@/lib/users";
import { inviteUserSchema } from "@/schemas";
import type { Role } from "@/types";
import { revalidatePath } from "next/cache";

export async function inviteUserAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = inviteUserSchema.parse(input);
    const session = await requirePermission("users.write");
    const admin = createAdminClient();

    const { data: existingResult } = await admin.auth.admin.listUsers({ perPage: 200 });
    const existing = existingResult.users.find((user) => user.email?.toLowerCase() === data.email.toLowerCase());

    let userId = existing?.id;
    if (existing) {
      await attachToSoleBusiness(existing.id, {
        role: data.role,
        fullName: data.fullName,
        email: data.email,
      });
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
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
      userId = created.user?.id;
      if (userId) {
        await attachToSoleBusiness(userId, {
          role: data.role,
          fullName: data.fullName,
          email: data.email,
        });
      }
    }

    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "user_created",
      entityType: "user",
      entityId: userId,
      newValues: { email: data.email, role: data.role },
    });
    revalidatePath("/users");
    return ok(userId ?? "");
  } catch (error) {
    logError("invite-user", error);
    return fail(getErrorMessage(error, "Unable to add user."));
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

export async function deleteUserAction(userId: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("users.write");
    if (userId === session.userId) return fail("You cannot delete your own account.");

    const admin = createAdminClient();
    const { data: owned } = await admin.from("businesses").select("id").eq("owner_id", userId).limit(1);
    if (owned?.length) {
      return fail("This login owns the company, so it cannot be deleted. Keep it, or transfer ownership first.");
    }

    const { data: target } = await admin
      .from("profiles")
      .select("id, email, role, business_id")
      .eq("id", userId)
      .maybeSingle();
    if (!target) return fail("User not found.");
    if (target.business_id && target.business_id !== session.businessId) {
      return fail("User not found.");
    }
    if (target.business_id === session.businessId && target.role === "owner" && session.role !== "owner") {
      return fail("Only the owner can remove this user.");
    }

    const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
    if (profileError) throw profileError;

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      if (/database error deleting user/i.test(error.message)) {
        return fail("This login still owns the company in the database, so Auth refused the delete.");
      }
      throw error;
    }

    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "user_deleted",
      entityType: "user",
      entityId: userId,
      oldValues: { email: target.email, role: target.role },
    });
    revalidatePath("/users");
    return ok(userId);
  } catch (error) {
    logError("delete-user", error);
    return fail(getErrorMessage(error, "Unable to delete user."));
  }
}
