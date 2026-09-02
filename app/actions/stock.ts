"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { mapDbError, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { stockAdjustmentSchema, stockInSchema, stockOutSchema } from "@/schemas";
import { revalidatePath } from "next/cache";

async function applyStock(params: {
  businessId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  type: string;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_stock_transaction", {
    p_business_id: params.businessId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_transaction_type: params.type,
    p_quantity: params.quantity,
    p_unit_cost: params.unitCost ?? null,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
    p_performed_by: params.userId,
  });
  if (error) {
    throw new Error(mapDbError(error.message) ?? error.message);
  }
  return data as string;
}

export async function stockInAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = stockInSchema.parse(input);
    const session = await requirePermission("stock.in");
    const txId = await applyStock({
      businessId: session.businessId,
      userId: session.userId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.transactionType,
      quantity: data.quantity,
      unitCost: data.unitCost,
      referenceType: data.supplierId ? "supplier" : data.reference ? "manual" : null,
      referenceId: data.supplierId || null,
      reason: data.reason,
      notes: data.notes || null,
    });
    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "stock_added",
      entityType: "stock_transaction",
      entityId: txId,
      newValues: data,
    });
    revalidatePath("/inventory");
    revalidatePath("/stock/in");
    revalidatePath("/dashboard");
    return ok(txId);
  } catch (error) {
    logError("stock-in", error);
    return fail(getErrorMessage(error, "Unable to record stock in."));
  }
}

export async function stockOutAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = stockOutSchema.parse(input);
    const session = await requirePermission("stock.out");
    const txId = await applyStock({
      businessId: session.businessId,
      userId: session.userId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.transactionType,
      quantity: data.quantity,
      reason: data.reason,
      notes: [data.reference, data.notes].filter(Boolean).join(" — ") || null,
    });
    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "stock_removed",
      entityType: "stock_transaction",
      entityId: txId,
      newValues: data,
    });
    revalidatePath("/inventory");
    revalidatePath("/stock/out");
    revalidatePath("/dashboard");
    return ok(txId);
  } catch (error) {
    logError("stock-out", error);
    return fail(getErrorMessage(error, "Unable to record stock out."));
  }
}

export async function adjustStockAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = stockAdjustmentSchema.parse(input);
    const session = await requirePermission("stock.adjust");
    const txId = await applyStock({
      businessId: session.businessId,
      userId: session.userId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.direction === "in" ? "adjustment_in" : "adjustment_out",
      quantity: data.quantity,
      reason: data.reason,
      notes: data.notes || null,
    });
    const supabase = await createClient();
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: data.direction === "in" ? "stock_added" : "stock_removed",
      entityType: "stock_transaction",
      entityId: txId,
      newValues: data,
    });
    revalidatePath("/inventory");
    revalidatePath(`/products/${data.productId}`);
    return ok(txId);
  } catch (error) {
    logError("stock-adjust", error);
    return fail(getErrorMessage(error, "Unable to adjust stock."));
  }
}

export { applyStock };
