"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { appConfig } from "@/lib/config";
import { getErrorMessage, logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const data = loginSchema.parse(input);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        return fail("Please verify your email before signing in.");
      }
      return fail("Invalid email or password.");
    }

    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id, status")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (profile?.status === "disabled") {
      await supabase.auth.signOut();
      return fail("This account has been disabled. Contact your administrator.");
    }

    return ok({ redirectTo: profile?.business_id ? "/dashboard" : "/onboarding" });
  } catch (error) {
    logError("login", error);
    return fail(getErrorMessage(error, "Unable to sign in."));
  }
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<{ message: string }>> {
  try {
    const data = forgotPasswordSchema.parse(input);
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? appConfig.appUrl;
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      logError("forgot-password", error);
    }
    return ok({
      message: "If an account exists for that email, we sent a reset link.",
    });
  } catch (error) {
    logError("forgot-password", error);
    return fail(getErrorMessage(error, "Unable to send reset email."));
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const data = resetPasswordSchema.parse(input);
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) return fail("Unable to update password. Try the reset link again.");
    return ok({ redirectTo: "/dashboard" });
  } catch (error) {
    logError("reset-password", error);
    return fail(getErrorMessage(error, "Unable to update password."));
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updatePasswordAction(currentPassword: string, newPassword: string): Promise<ActionResult<string>> {
  try {
    if (newPassword.length < 8) return fail("New password must be at least 8 characters.");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return fail("You must be signed in.");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) return fail("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return fail("Unable to update password.");
    return ok("Password updated.");
  } catch (error) {
    logError("update-password", error);
    return fail(getErrorMessage(error));
  }
}

export async function appName() {
  return appConfig.name;
}
