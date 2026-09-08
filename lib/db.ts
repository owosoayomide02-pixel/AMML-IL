import "server-only";

import type { Json } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    businessId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: Json | null;
    newValues?: Json | null;
    ipAddress?: string | null;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
    ip_address: input.ipAddress ?? null,
  });

  if (error) {
    console.error("[audit]", error.message);
  }
}

export async function getSetting<T>(
  supabase: SupabaseClient,
  businessId: string,
  key: string,
  fallback: T,
): Promise<T> {
  const { data } = await supabase
    .from("settings")
    .select("setting_value")
    .eq("business_id", businessId)
    .eq("setting_key", key)
    .maybeSingle();

  if (!data?.setting_value) return fallback;
  return data.setting_value as T;
}

export async function upsertSetting(
  supabase: SupabaseClient,
  businessId: string,
  key: string,
  value: Json,
) {
  const { error } = await supabase.from("settings").upsert(
    {
      business_id: businessId,
      setting_key: key,
      setting_value: value,
    },
    { onConflict: "business_id,setting_key" },
  );
  if (error) throw error;
}

export function mapDbError(message: string) {
  if (/duplicate key/i.test(message) && /item_code/i.test(message)) {
    return "A spare with this Item ID already exists.";
  }
  if (/duplicate key/i.test(message) && /sku/i.test(message)) {
    return "A product with this SKU already exists.";
  }
  if (/duplicate key/i.test(message) && /barcode/i.test(message)) {
    return "A product with this barcode already exists.";
  }
  if (/duplicate key/i.test(message) && /purchase_number/i.test(message)) {
    return "This purchase number is already in use.";
  }
  if (/duplicate key/i.test(message) && /invoice_number/i.test(message)) {
    return "This invoice number is already in use.";
  }
  if (/Insufficient stock/i.test(message)) {
    return "There is not enough stock for this movement.";
  }
  if (/Quantity must be greater/i.test(message)) {
    return "Quantity must be greater than zero.";
  }
  return null;
}
