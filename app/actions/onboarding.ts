"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getErrorMessage, logError } from "@/lib/errors";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { attachToSoleBusiness } from "@/lib/users";
import {
  categorySchema,
  onboardingBusinessSchema,
  onboardingLocationSchema,
  productSchema,
  warehouseSchema,
} from "@/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBusinessAction(
  input: unknown,
): Promise<ActionResult<{ businessId: string; joinedExisting?: boolean }>> {
  try {
    const data = onboardingBusinessSchema.parse(input);
    const session = await requireSession();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.userId)
      .maybeSingle();
    if (existing?.business_id) return ok({ businessId: existing.business_id });

    try {
      const admin = createAdminClient();
      const { count } = await admin.from("businesses").select("id", { count: "exact", head: true });
      if ((count ?? 0) > 0) {
        const joined = await attachToSoleBusiness(session.userId, {
          email: session.email,
          fullName: session.profile.full_name,
        });
        if (!joined) return fail("Unable to add this login to the company.");
        revalidatePath("/", "layout");
        return ok({ businessId: joined.businessId, joinedExisting: true });
      }
    } catch {
      // Service role is optional locally; continue with first-time setup.
    }

    const { data: business, error } = await supabase
      .from("businesses")
      .insert({
        business_name: data.businessName,
        business_email: data.businessEmail || session.email,
        phone: data.phone || null,
        address: data.address || null,
        tax_number: data.taxNumber || null,
        owner_id: session.userId,
      })
      .select("id")
      .single();

    if (error || !business) throw error;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        business_id: business.id,
        role: "owner",
        full_name: session.profile.full_name || data.businessName,
      })
      .eq("id", session.userId);
    if (profileError) throw profileError;

    await supabase.rpc("seed_default_settings", { p_business_id: business.id });

    revalidatePath("/", "layout");
    return ok({ businessId: business.id });
  } catch (error) {
    logError("create-business", error);
    return fail(getErrorMessage(error, "Unable to create the business profile."));
  }
}

export async function saveOnboardingLocationAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = onboardingLocationSchema.parse(input);
    const session = await requireSession();
    if (!session.profile.business_id) return fail("Create your business first.");
    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        country: data.country,
        city: data.city || null,
        state: data.state || null,
        currency: data.currency,
      })
      .eq("id", session.profile.business_id);
    if (error) throw error;
    return ok("saved");
  } catch (error) {
    logError("onboarding-location", error);
    return fail(getErrorMessage(error, "Unable to save location settings."));
  }
}

export async function createOnboardingWarehouseAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = warehouseSchema.parse(input);
    const session = await requireSession();
    if (!session.profile.business_id) return fail("Create your business first.");
    const supabase = await createClient();
    const { data: warehouse, error } = await supabase
      .from("warehouses")
      .insert({
        business_id: session.profile.business_id,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address || null,
        description: data.description || null,
      })
      .select("id")
      .single();
    if (error || !warehouse) throw error;
    await supabase.from("settings").upsert(
      {
        business_id: session.profile.business_id,
        setting_key: "default_warehouse",
        setting_value: { id: warehouse.id },
      },
      { onConflict: "business_id,setting_key" },
    );
    return ok(warehouse.id);
  } catch (error) {
    logError("onboarding-warehouse", error);
    return fail(getErrorMessage(error, "Unable to create location."));
  }
}

export async function createOnboardingCategoryAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = categorySchema.parse(input);
    const session = await requireSession();
    if (!session.profile.business_id) return fail("Create your business first.");
    const supabase = await createClient();
    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        business_id: session.profile.business_id,
        name: data.name,
        description: data.description || null,
      })
      .select("id")
      .single();
    if (error || !category) throw error;
    return ok(category.id);
  } catch (error) {
    logError("onboarding-category", error);
    return fail(getErrorMessage(error, "Unable to create category."));
  }
}

export async function createOnboardingProductAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = productSchema.parse(input);
    const session = await requireSession();
    if (!session.profile.business_id) return fail("Create your business first.");
    const supabase = await createClient();
    const sku = data.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        business_id: session.profile.business_id,
        name: data.name,
        sku,
        category_id: data.categoryId || null,
        unit: data.unit,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        minimum_stock_level: data.minimumStockLevel,
        reorder_quantity: data.reorderQuantity,
      })
      .select("id")
      .single();
    if (error || !product) throw error;
    return ok(product.id);
  } catch (error) {
    logError("onboarding-product", error);
    return fail(getErrorMessage(error, "Unable to create product."));
  }
}

export async function completeOnboardingAction() {
  const session = await requireSession();
  if (!session.profile.business_id) redirect("/onboarding");
  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ onboarding_completed: true })
    .eq("id", session.profile.business_id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
