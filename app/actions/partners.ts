"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { customerSchema, supplierSchema } from "@/schemas";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = supplierSchema.parse(input);
    const session = await requirePermission("suppliers.write");
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("suppliers")
      .insert({
        business_id: session.businessId,
        supplier_name: data.supplierName,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        tax_number: data.taxNumber || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error || !row) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "supplier_created",
      entityType: "supplier",
      entityId: row.id,
      newValues: data,
    });
    revalidatePath("/suppliers");
    return ok(row.id);
  } catch (error) {
    logError("create-supplier", error);
    return fail(getErrorMessage(error, "Unable to create supplier."));
  }
}

export async function updateSupplierAction(id: string, input: unknown): Promise<ActionResult<string>> {
  try {
    const data = supplierSchema.parse(input);
    const session = await requirePermission("suppliers.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("suppliers")
      .update({
        supplier_name: data.supplierName,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        tax_number: data.taxNumber || null,
        notes: data.notes || null,
      })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);
    return ok(id);
  } catch (error) {
    logError("update-supplier", error);
    return fail(getErrorMessage(error, "Unable to update supplier."));
  }
}

export async function createCustomerAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = customerSchema.parse(input);
    const session = await requirePermission("customers.write");
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("customers")
      .insert({
        business_id: session.businessId,
        customer_name: data.customerName,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error || !row) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "customer_created",
      entityType: "customer",
      entityId: row.id,
      newValues: data,
    });
    revalidatePath("/customers");
    return ok(row.id);
  } catch (error) {
    logError("create-customer", error);
    return fail(getErrorMessage(error, "Unable to create customer."));
  }
}

export async function updateCustomerAction(id: string, input: unknown): Promise<ActionResult<string>> {
  try {
    const data = customerSchema.parse(input);
    const session = await requirePermission("customers.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update({
        customer_name: data.customerName,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
      })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return ok(id);
  } catch (error) {
    logError("update-customer", error);
    return fail(getErrorMessage(error, "Unable to update customer."));
  }
}
