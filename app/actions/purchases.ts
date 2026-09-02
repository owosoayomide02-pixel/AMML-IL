"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getSetting, mapDbError, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { purchaseSchema, receivePurchaseSchema } from "@/schemas";
import { applyStock } from "@/app/actions/stock";
import { revalidatePath } from "next/cache";

function paymentStatus(total: number, paid: number) {
  if (paid <= 0) return "unpaid" as const;
  if (paid >= total) return "paid" as const;
  return "partial" as const;
}

export async function createPurchaseAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = purchaseSchema.parse(input);
    const session = await requirePermission("purchases.write");
    const supabase = await createClient();
    const prefix = (await getSetting<{ value: string }>(supabase, session.businessId, "purchase_prefix", { value: "PO" }))
      .value;
    const { data: purchaseNumber, error: numError } = await supabase.rpc("next_document_number", {
      p_business_id: session.businessId,
      p_document_type: "purchase",
      p_prefix: prefix,
    });
    if (numError || !purchaseNumber) throw numError;

    const items = data.items.map((item) => {
      const line = item.quantity * item.costPrice - item.discount + item.tax;
      return { ...item, total: line };
    });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
    const total = Math.max(0, subtotal + data.tax - data.discount);
    const balance = Math.max(0, total - data.amountPaid);

    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        business_id: session.businessId,
        supplier_id: data.supplierId || null,
        purchase_number: purchaseNumber,
        purchase_date: data.purchaseDate,
        expected_delivery_date: data.expectedDeliveryDate || null,
        status: data.status,
        subtotal,
        tax: data.tax,
        discount: data.discount,
        total,
        amount_paid: data.amountPaid,
        balance,
        payment_status: paymentStatus(total, data.amountPaid),
        notes: data.notes || null,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error || !purchase) throw error;

    const { error: itemError } = await supabase.from("purchase_items").insert(
      items.map((item) => ({
        purchase_id: purchase.id,
        product_id: item.productId,
        warehouse_id: item.warehouseId,
        quantity: item.quantity,
        received_quantity: 0,
        cost_price: item.costPrice,
        tax: item.tax,
        discount: item.discount,
        total: item.total,
      })),
    );
    if (itemError) throw itemError;

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "purchase_created",
      entityType: "purchase",
      entityId: purchase.id,
      newValues: { purchaseNumber, total },
    });
    revalidatePath("/purchases");
    return ok(purchase.id);
  } catch (error) {
    logError("create-purchase", error);
    return fail(getErrorMessage(error, "Unable to create purchase order."));
  }
}

export async function updatePurchaseStatusAction(id: string, status: "ordered" | "cancelled"): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("purchases.write");
    const supabase = await createClient();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("status")
      .eq("id", id)
      .eq("business_id", session.businessId)
      .single();
    if (!purchase) return fail("Purchase not found.");
    if (purchase.status === "received" || purchase.status === "cancelled") {
      return fail("This purchase can no longer be changed.");
    }
    const { error } = await supabase
      .from("purchases")
      .update({ status })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    revalidatePath(`/purchases/${id}`);
    return ok(id);
  } catch (error) {
    logError("update-purchase-status", error);
    return fail(getErrorMessage(error, "Unable to update purchase."));
  }
}

export async function receivePurchaseAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = receivePurchaseSchema.parse(input);
    const session = await requirePermission("purchases.receive");
    const supabase = await createClient();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("*, purchase_items(*)")
      .eq("id", data.purchaseId)
      .eq("business_id", session.businessId)
      .single();
    if (!purchase) return fail("Purchase not found.");
    if (purchase.status === "cancelled" || purchase.status === "draft") {
      return fail("Order the purchase before receiving stock.");
    }

    for (const incoming of data.items) {
      const item = (purchase.purchase_items as Array<{
        id: string;
        product_id: string;
        warehouse_id: string;
        quantity: number;
        received_quantity: number;
        cost_price: number;
      }>).find((row) => row.id === incoming.itemId);
      if (!item || incoming.quantity <= 0) continue;
      const remaining = Number(item.quantity) - Number(item.received_quantity);
      const qty = Math.min(remaining, incoming.quantity);
      if (qty <= 0) continue;

      await applyStock({
        businessId: session.businessId,
        userId: session.userId,
        productId: item.product_id,
        warehouseId: item.warehouse_id,
        type: "purchase",
        quantity: qty,
        unitCost: Number(item.cost_price),
        referenceType: "purchase",
        referenceId: purchase.id,
        reason: "Purchase received",
      });

      await supabase
        .from("purchase_items")
        .update({ received_quantity: Number(item.received_quantity) + qty })
        .eq("id", item.id);
    }

    const { data: items } = await supabase
      .from("purchase_items")
      .select("quantity, received_quantity")
      .eq("purchase_id", purchase.id);
    const allReceived = (items ?? []).every((item) => Number(item.received_quantity) >= Number(item.quantity));
    const anyReceived = (items ?? []).some((item) => Number(item.received_quantity) > 0);
    const nextStatus = allReceived ? "received" : anyReceived ? "partially_received" : purchase.status;

    await supabase
      .from("purchases")
      .update({ status: nextStatus })
      .eq("id", purchase.id)
      .eq("business_id", session.businessId);

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "purchase_received",
      entityType: "purchase",
      entityId: purchase.id,
      newValues: { status: nextStatus },
    });
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${purchase.id}`);
    revalidatePath("/inventory");
    return ok(purchase.id);
  } catch (error) {
    logError("receive-purchase", error);
    return fail(mapDbError(error instanceof Error ? error.message : "") ?? getErrorMessage(error, "Unable to receive purchase."));
  }
}
