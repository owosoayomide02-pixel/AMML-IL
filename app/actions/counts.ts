"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getSetting, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { applyStock } from "@/app/actions/stock";
import { revalidatePath } from "next/cache";

export async function startCountAction(warehouseId: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("counts.write");
    const supabase = await createClient();
    const prefix = (await getSetting<{ value: string }>(supabase, session.businessId, "count_prefix", { value: "CNT" }))
      .value;
    const { data: countNumber, error: numError } = await supabase.rpc("next_document_number", {
      p_business_id: session.businessId,
      p_document_type: "count",
      p_prefix: prefix,
    });
    if (numError || !countNumber) throw numError;

    const { data: count, error } = await supabase
      .from("inventory_counts")
      .insert({
        business_id: session.businessId,
        warehouse_id: warehouseId,
        count_number: countNumber,
        count_date: new Date().toISOString().slice(0, 10),
        status: "in_progress",
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error || !count) throw error;

    const { data: inventory } = await supabase
      .from("inventory")
      .select("product_id, quantity_on_hand")
      .eq("business_id", session.businessId)
      .eq("warehouse_id", warehouseId);

    if (inventory && inventory.length > 0) {
      await supabase.from("inventory_count_items").insert(
        inventory.map((row) => ({
          inventory_count_id: count.id,
          product_id: row.product_id,
          system_quantity: row.quantity_on_hand,
          counted_quantity: null,
          variance: null,
        })),
      );
    }

    revalidatePath("/counts");
    return ok(count.id);
  } catch (error) {
    logError("start-count", error);
    return fail(getErrorMessage(error, "Unable to start stock count."));
  }
}

export async function saveCountItemsAction(
  countId: string,
  items: Array<{ itemId: string; countedQuantity: number; reason?: string }>,
): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("counts.write");
    const supabase = await createClient();
    const { data: count } = await supabase
      .from("inventory_counts")
      .select("id, status")
      .eq("id", countId)
      .eq("business_id", session.businessId)
      .single();
    if (!count || count.status === "approved" || count.status === "cancelled") {
      return fail("This count can no longer be edited.");
    }

    for (const item of items) {
      const { data: existing } = await supabase
        .from("inventory_count_items")
        .select("system_quantity")
        .eq("id", item.itemId)
        .single();
      const system = Number(existing?.system_quantity ?? 0);
      await supabase
        .from("inventory_count_items")
        .update({
          counted_quantity: item.countedQuantity,
          variance: item.countedQuantity - system,
          reason: item.reason || null,
        })
        .eq("id", item.itemId);
    }

    await supabase
      .from("inventory_counts")
      .update({ status: "pending_approval" })
      .eq("id", countId)
      .eq("business_id", session.businessId);
    revalidatePath(`/counts/${countId}`);
    return ok(countId);
  } catch (error) {
    logError("save-count", error);
    return fail(getErrorMessage(error, "Unable to save count."));
  }
}

export async function approveCountAction(countId: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("counts.approve");
    const supabase = await createClient();
    const { data: count } = await supabase
      .from("inventory_counts")
      .select("*, inventory_count_items(*)")
      .eq("id", countId)
      .eq("business_id", session.businessId)
      .single();
    if (!count) return fail("Count not found.");
    if (count.status !== "pending_approval") return fail("This count is not waiting for approval.");

    const items = count.inventory_count_items as Array<{
      product_id: string;
      system_quantity: number;
      counted_quantity: number | null;
      variance: number | null;
    }>;

    for (const item of items) {
      const counted = item.counted_quantity;
      if (counted == null) continue;
      const variance = counted - Number(item.system_quantity);
      if (variance === 0) continue;
      await applyStock({
        businessId: session.businessId,
        userId: session.userId,
        productId: item.product_id,
        warehouseId: count.warehouse_id,
        type: variance > 0 ? "adjustment_in" : "adjustment_out",
        quantity: Math.abs(variance),
        referenceType: "inventory_count",
        referenceId: count.id,
        reason: "Physical count adjustment",
      });
    }

    await supabase
      .from("inventory_counts")
      .update({ status: "approved", completed_at: new Date().toISOString() })
      .eq("id", countId)
      .eq("business_id", session.businessId);

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "inventory_count_approved",
      entityType: "inventory_count",
      entityId: countId,
    });
    revalidatePath("/counts");
    revalidatePath("/inventory");
    return ok(countId);
  } catch (error) {
    logError("approve-count", error);
    return fail(getErrorMessage(error, "Unable to approve count."));
  }
}

export async function cancelCountAction(countId: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("counts.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("inventory_counts")
      .update({ status: "cancelled" })
      .eq("id", countId)
      .eq("business_id", session.businessId)
      .neq("status", "approved");
    if (error) throw error;
    revalidatePath("/counts");
    return ok(countId);
  } catch (error) {
    logError("cancel-count", error);
    return fail(getErrorMessage(error, "Unable to cancel count."));
  }
}
