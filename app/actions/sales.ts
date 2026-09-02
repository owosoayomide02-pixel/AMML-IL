"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getSetting, mapDbError, writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { saleSchema } from "@/schemas";
import { applyStock } from "@/app/actions/stock";
import { revalidatePath } from "next/cache";

function paymentStatus(total: number, paid: number) {
  if (paid <= 0) return "unpaid" as const;
  if (paid >= total) return "paid" as const;
  return "partial" as const;
}

export async function createSaleAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = saleSchema.parse(input);
    const session = await requirePermission("sales.write");
    const supabase = await createClient();
    const prefix = (await getSetting<{ value: string }>(supabase, session.businessId, "invoice_prefix", { value: "INV" }))
      .value;
    const { data: invoiceNumber, error: numError } = await supabase.rpc("next_document_number", {
      p_business_id: session.businessId,
      p_document_type: "sale",
      p_prefix: prefix,
    });
    if (numError || !invoiceNumber) throw numError;

    const productIds = data.items.map((item) => item.productId);
    const { data: products } = await supabase
      .from("products")
      .select("id, cost_price, selling_price")
      .eq("business_id", session.businessId)
      .in("id", productIds);
    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    const items = data.items.map((item) => {
      const product = productMap.get(item.productId);
      const line = item.quantity * item.sellingPrice - item.discount + item.tax;
      return {
        ...item,
        costPrice: Number(product?.cost_price ?? 0),
        total: line,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
    const total = Math.max(0, subtotal + data.tax - data.discount);
    const balance = Math.max(0, total - data.amountPaid);
    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        business_id: session.businessId,
        customer_id: data.customerId || null,
        invoice_number: invoiceNumber,
        sale_date: data.saleDate,
        status: "draft",
        subtotal,
        tax: data.tax,
        discount: data.discount,
        total,
        amount_paid: data.amountPaid,
        balance,
        payment_status: paymentStatus(total, data.amountPaid),
        payment_method: data.paymentMethod || null,
        notes: data.notes || null,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error || !sale) throw error;

    const { error: itemError } = await supabase.from("sale_items").insert(
      items.map((item) => ({
        sale_id: sale.id,
        product_id: item.productId,
        warehouse_id: item.warehouseId,
        quantity: item.quantity,
        selling_price: item.sellingPrice,
        cost_price: item.costPrice,
        tax: item.tax,
        discount: item.discount,
        total: item.total,
      })),
    );
    if (itemError) throw itemError;

    if (data.confirm) {
      for (const item of items) {
        await applyStock({
          businessId: session.businessId,
          userId: session.userId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          type: "sale",
          quantity: item.quantity,
          unitCost: item.costPrice,
          referenceType: "sale",
          referenceId: sale.id,
          reason: "Sale",
        });
      }
      await supabase
        .from("sales")
        .update({ status: data.amountPaid >= total ? "completed" : "confirmed" })
        .eq("id", sale.id);
    }

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "sale_created",
      entityType: "sale",
      entityId: sale.id,
      newValues: { invoiceNumber, total, status: data.confirm ? "confirmed" : "draft" },
    });
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return ok(sale.id);
  } catch (error) {
    logError("create-sale", error);
    return fail(mapDbError(error instanceof Error ? error.message : "") ?? getErrorMessage(error, "Unable to create sale."));
  }
}

export async function cancelSaleAction(id: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("sales.write");
    const supabase = await createClient();
    const { data: sale } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("id", id)
      .eq("business_id", session.businessId)
      .single();
    if (!sale) return fail("Sale not found.");
    if (sale.status === "cancelled") return fail("Sale is already cancelled.");

    if (sale.status === "confirmed" || sale.status === "completed") {
      const items = sale.sale_items as Array<{
        product_id: string;
        warehouse_id: string;
        quantity: number;
        cost_price: number;
      }>;
      for (const item of items) {
        await applyStock({
          businessId: session.businessId,
          userId: session.userId,
          productId: item.product_id,
          warehouseId: item.warehouse_id,
          type: "return_in",
          quantity: Number(item.quantity),
          unitCost: Number(item.cost_price),
          referenceType: "sale",
          referenceId: sale.id,
          reason: "Sale cancelled",
        });
      }
    }

    await supabase
      .from("sales")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("business_id", session.businessId);
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "sale_cancelled",
      entityType: "sale",
      entityId: id,
    });
    revalidatePath("/sales");
    revalidatePath(`/sales/${id}`);
    revalidatePath("/inventory");
    return ok(id);
  } catch (error) {
    logError("cancel-sale", error);
    return fail(getErrorMessage(error, "Unable to cancel sale."));
  }
}
