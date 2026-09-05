"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { upsertSetting, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  businessSettingsSchema,
  inventorySettingsSchema,
  profileSettingsSchema,
  purchaseSettingsSchema,
  salesSettingsSchema,
} from "@/schemas";
import { revalidatePath } from "next/cache";

export async function updateBusinessSettingsAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = businessSettingsSchema.parse(input);
    const session = await requirePermission("settings.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        business_name: data.businessName,
        business_email: data.businessEmail || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        tax_number: data.taxNumber || null,
        currency: data.currency,
      })
      .eq("id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "settings_updated",
      entityType: "business",
      entityId: session.businessId,
      newValues: data,
    });
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("business-settings", error);
    return fail(getErrorMessage(error, "Unable to save business settings."));
  }
}

export async function updateInventorySettingsAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = inventorySettingsSchema.parse(input);
    const session = await requirePermission("settings.write");
    if (data.allowNegativeInventory && session.role !== "owner") {
      return fail("Only the owner can enable negative inventory.");
    }
    const supabase = await createClient();
    await upsertSetting(supabase, session.businessId, "allow_negative_inventory", {
      enabled: data.allowNegativeInventory,
    });
    await upsertSetting(supabase, session.businessId, "default_warehouse", { id: data.defaultWarehouseId || null });
    await upsertSetting(supabase, session.businessId, "default_unit", { value: data.defaultUnit });
    await upsertSetting(supabase, session.businessId, "sku_format", { prefix: data.skuPrefix });
    await upsertSetting(supabase, session.businessId, "low_stock_alerts", { enabled: data.lowStockAlerts });
    await upsertSetting(supabase, session.businessId, "usd_ngn_rate", { rate: data.usdNgnRate });
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "settings_updated",
      entityType: "settings",
      newValues: data,
    });
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("inventory-settings", error);
    return fail(getErrorMessage(error, "Unable to save inventory settings."));
  }
}

export async function updateSalesSettingsAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = salesSettingsSchema.parse(input);
    const session = await requirePermission("settings.write");
    const supabase = await createClient();
    await upsertSetting(supabase, session.businessId, "invoice_prefix", { value: data.invoicePrefix });
    await upsertSetting(supabase, session.businessId, "default_tax", { rate: data.defaultTax });
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("sales-settings", error);
    return fail(getErrorMessage(error, "Unable to save sales settings."));
  }
}

export async function updatePurchaseSettingsAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = purchaseSettingsSchema.parse(input);
    const session = await requirePermission("settings.write");
    const supabase = await createClient();
    await upsertSetting(supabase, session.businessId, "purchase_prefix", { value: data.purchasePrefix });
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("purchase-settings", error);
    return fail(getErrorMessage(error, "Unable to save purchase settings."));
  }
}

export async function updateProfileSettingsAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = profileSettingsSchema.parse(input);
    const session = await requirePermission("settings.read");
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone || null })
      .eq("id", session.userId);
    if (error) throw error;
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("profile-settings", error);
    return fail(getErrorMessage(error, "Unable to save profile."));
  }
}

export async function saveLogoUrlAction(url: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.write");
    const supabase = await createClient();
    const { error } = await supabase.from("businesses").update({ logo_url: url }).eq("id", session.businessId);
    if (error) throw error;
    revalidatePath("/settings");
    return ok(url);
  } catch (error) {
    logError("save-logo", error);
    return fail(getErrorMessage(error, "Unable to save logo."));
  }
}

export async function saveAvatarUrlAction(url: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.read");
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.userId);
    if (error) throw error;
    revalidatePath("/settings");
    return ok(url);
  } catch (error) {
    logError("save-avatar", error);
    return fail(getErrorMessage(error, "Unable to save avatar."));
  }
}

export async function markAlertReadAction(id: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("alerts.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return ok(id);
  } catch (error) {
    logError("mark-alert", error);
    return fail(getErrorMessage(error, "Unable to update alert."));
  }
}

export async function markAllAlertsReadAction(): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("alerts.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("business_id", session.businessId)
      .eq("is_read", false);
    if (error) throw error;
    revalidatePath("/alerts");
    return ok("ok");
  } catch (error) {
    logError("mark-all-alerts", error);
    return fail(getErrorMessage(error, "Unable to update alerts."));
  }
}
