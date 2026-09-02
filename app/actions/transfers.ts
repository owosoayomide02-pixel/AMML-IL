"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getSetting, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { transferSchema } from "@/schemas";
import { applyStock } from "@/app/actions/stock";
import { revalidatePath } from "next/cache";
import type { TransferStatus } from "@/types";

export async function createTransferAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = transferSchema.parse(input);
    if (data.fromWarehouseId === data.toWarehouseId) {
      return fail("Choose two different warehouses.");
    }
    const session = await requirePermission("transfers.write");
    const supabase = await createClient();
    const prefix = (await getSetting<{ value: string }>(supabase, session.businessId, "transfer_prefix", { value: "TR" }))
      .value;
    const { data: transferNumber, error: numError } = await supabase.rpc("next_document_number", {
      p_business_id: session.businessId,
      p_document_type: "transfer",
      p_prefix: prefix,
    });
    if (numError || !transferNumber) throw numError;

    const { data: transfer, error } = await supabase
      .from("stock_transfers")
      .insert({
        business_id: session.businessId,
        transfer_number: transferNumber,
        from_warehouse_id: data.fromWarehouseId,
        to_warehouse_id: data.toWarehouseId,
        status: "draft",
        notes: data.notes || null,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error || !transfer) throw error;

    const { error: itemError } = await supabase.from("stock_transfer_items").insert(
      data.items.map((item) => ({
        transfer_id: transfer.id,
        product_id: item.productId,
        quantity: item.quantity,
      })),
    );
    if (itemError) throw itemError;
    revalidatePath("/transfers");
    return ok(transfer.id);
  } catch (error) {
    logError("create-transfer", error);
    return fail(getErrorMessage(error, "Unable to create transfer."));
  }
}

export async function updateTransferStatusAction(id: string, next: TransferStatus): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("transfers.write");
    const supabase = await createClient();
    const { data: transfer } = await supabase
      .from("stock_transfers")
      .select("*, stock_transfer_items(*)")
      .eq("id", id)
      .eq("business_id", session.businessId)
      .single();
    if (!transfer) return fail("Transfer not found.");

    const current = transfer.status as TransferStatus;
    const allowed: Record<TransferStatus, TransferStatus[]> = {
      draft: ["pending", "cancelled"],
      pending: ["in_transit", "cancelled"],
      in_transit: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    if (!allowed[current].includes(next)) {
      return fail("This status change is not allowed.");
    }

    const items = transfer.stock_transfer_items as Array<{ product_id: string; quantity: number }>;

    if (next === "in_transit") {
      for (const item of items) {
        await applyStock({
          businessId: session.businessId,
          userId: session.userId,
          productId: item.product_id,
          warehouseId: transfer.from_warehouse_id,
          type: "transfer_out",
          quantity: Number(item.quantity),
          referenceType: "transfer",
          referenceId: transfer.id,
          reason: "Warehouse transfer out",
        });
      }
    }

    if (next === "completed") {
      if (current !== "in_transit") return fail("Stock must be in transit before completion.");
      for (const item of items) {
        await applyStock({
          businessId: session.businessId,
          userId: session.userId,
          productId: item.product_id,
          warehouseId: transfer.to_warehouse_id,
          type: "transfer_in",
          quantity: Number(item.quantity),
          referenceType: "transfer",
          referenceId: transfer.id,
          reason: "Warehouse transfer in",
        });
      }
    }

    if (next === "cancelled" && current === "in_transit") {
      for (const item of items) {
        await applyStock({
          businessId: session.businessId,
          userId: session.userId,
          productId: item.product_id,
          warehouseId: transfer.from_warehouse_id,
          type: "transfer_in",
          quantity: Number(item.quantity),
          referenceType: "transfer",
          referenceId: transfer.id,
          reason: "Transfer cancelled — returned to source",
        });
      }
    }

    await supabase
      .from("stock_transfers")
      .update({
        status: next,
        completed_at: next === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("business_id", session.businessId);

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "transfer_updated",
      entityType: "stock_transfer",
      entityId: id,
      newValues: { status: next },
    });
    revalidatePath("/transfers");
    revalidatePath(`/transfers/${id}`);
    revalidatePath("/inventory");
    return ok(id);
  } catch (error) {
    logError("update-transfer", error);
    return fail(getErrorMessage(error, "Unable to update transfer."));
  }
}
