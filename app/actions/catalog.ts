"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { syncStockAlerts } from "@/lib/alerts";
import { writeAuditLog, mapDbError } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { generateSku } from "@/lib/utils";
import { categorySchema, productSchema, warehouseSchema } from "@/schemas";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = categorySchema.parse(input);
    const session = await requirePermission("categories.write");
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("categories")
      .insert({
        business_id: session.businessId,
        name: data.name,
        description: data.description || null,
      })
      .select("id")
      .single();
    if (error || !row) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "category_created",
      entityType: "category",
      entityId: row.id,
      newValues: data,
    });
    revalidatePath("/categories");
    return ok(row.id);
  } catch (error) {
    logError("create-category", error);
    return fail(getErrorMessage(error, "Unable to create category."));
  }
}

export async function updateCategoryAction(id: string, input: unknown): Promise<ActionResult<string>> {
  try {
    const data = categorySchema.parse(input);
    const session = await requirePermission("categories.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({ name: data.name, description: data.description || null })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "category_updated",
      entityType: "category",
      entityId: id,
      newValues: data,
    });
    revalidatePath("/categories");
    return ok(id);
  } catch (error) {
    logError("update-category", error);
    return fail(getErrorMessage(error, "Unable to update category."));
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("categories.write");
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id).eq("business_id", session.businessId);
    if (error) throw error;
    revalidatePath("/categories");
    return ok(id);
  } catch (error) {
    logError("delete-category", error);
    return fail(getErrorMessage(error, "Unable to delete category. It may be in use."));
  }
}

export async function createWarehouseAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = warehouseSchema.parse(input);
    const session = await requirePermission("warehouses.write");
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("warehouses")
      .insert({
        business_id: session.businessId,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address || null,
        description: data.description || null,
        status: data.status,
      })
      .select("id")
      .single();
    if (error || !row) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "warehouse_created",
      entityType: "warehouse",
      entityId: row.id,
      newValues: data,
    });
    revalidatePath("/warehouses");
    return ok(row.id);
  } catch (error) {
    logError("create-warehouse", error);
    return fail(getErrorMessage(error, "Unable to create warehouse."));
  }
}

export async function updateWarehouseAction(id: string, input: unknown): Promise<ActionResult<string>> {
  try {
    const data = warehouseSchema.parse(input);
    const session = await requirePermission("warehouses.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("warehouses")
      .update({
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address || null,
        description: data.description || null,
        status: data.status,
      })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "warehouse_updated",
      entityType: "warehouse",
      entityId: id,
      newValues: data,
    });
    revalidatePath("/warehouses");
    return ok(id);
  } catch (error) {
    logError("update-warehouse", error);
    return fail(getErrorMessage(error, "Unable to update warehouse."));
  }
}

async function nextSku(businessId: string, name: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  return generateSku(name, (count ?? 0) + 1);
}

export async function createProductAction(input: unknown): Promise<ActionResult<string>> {
  try {
    const data = productSchema.parse(input);
    const session = await requirePermission("products.write");
    const supabase = await createClient();
    const sku = data.sku?.trim() || (await nextSku(session.businessId, data.name));
    const { data: row, error } = await supabase
      .from("products")
      .insert({
        business_id: session.businessId,
        category_id: data.categoryId || null,
        sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        brand: data.brand || null,
        manufacturer: data.manufacturer || null,
        unit: data.unit,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        minimum_stock_level: data.minimumStockLevel,
        reorder_quantity: data.reorderQuantity,
        image_url: data.imageUrl || null,
      })
      .select("id")
      .single();
    if (error || !row) {
      return fail(mapDbError(error?.message ?? "") ?? "Unable to create product.");
    }
    await recordPriceHistory(supabase, {
      businessId: session.businessId,
      productId: row.id,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      userId: session.userId,
    });
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "product_created",
      entityType: "product",
      entityId: row.id,
      newValues: { ...data, sku },
    });
    await syncStockAlerts(session.businessId);
    revalidatePath("/products");
    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return ok(row.id);
  } catch (error) {
    logError("create-product", error);
    return fail(getErrorMessage(error, "Unable to create product."));
  }
}

export async function updateProductAction(id: string, input: unknown): Promise<ActionResult<string>> {
  try {
    const data = productSchema.parse(input);
    const session = await requirePermission("products.write");
    const supabase = await createClient();
    const { data: previous } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("business_id", session.businessId)
      .single();
    const sku = data.sku?.trim() || previous?.sku;
    const { error } = await supabase
      .from("products")
      .update({
        category_id: data.categoryId || null,
        sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        brand: data.brand || null,
        manufacturer: data.manufacturer || null,
        unit: data.unit,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        minimum_stock_level: data.minimumStockLevel,
        reorder_quantity: data.reorderQuantity,
        image_url: data.imageUrl || null,
      })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) return fail(mapDbError(error.message) ?? "Unable to update product.");
    const costChanged = Number(previous?.cost_price) !== data.costPrice;
    const sellChanged = Number(previous?.selling_price) !== data.sellingPrice;
    if (costChanged || sellChanged) {
      await recordPriceHistory(supabase, {
        businessId: session.businessId,
        productId: id,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        userId: session.userId,
      });
    }
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "product_updated",
      entityType: "product",
      entityId: id,
      oldValues: previous,
      newValues: data,
    });
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return ok(id);
  } catch (error) {
    logError("update-product", error);
    return fail(getErrorMessage(error, "Unable to update product."));
  }
}

export async function archiveProductAction(id: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("products.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "product_archived",
      entityType: "product",
      entityId: id,
    });
    revalidatePath("/products");
    return ok(id);
  } catch (error) {
    logError("archive-product", error);
    return fail(getErrorMessage(error, "Unable to archive product."));
  }
}

export async function restoreProductAction(id: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("products.write");
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "active" })
      .eq("id", id)
      .eq("business_id", session.businessId);
    if (error) throw error;
    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "product_restored",
      entityType: "product",
      entityId: id,
    });
    revalidatePath("/products");
    return ok(id);
  } catch (error) {
    logError("restore-product", error);
    return fail(getErrorMessage(error, "Unable to restore product."));
  }
}

async function recordPriceHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { businessId: string; productId: string; costPrice: number; sellingPrice: number; userId: string },
) {
  const { error } = await supabase.from("product_price_history").insert({
    business_id: input.businessId,
    product_id: input.productId,
    cost_price: input.costPrice,
    selling_price: input.sellingPrice,
    changed_by: input.userId,
  });
  if (error) logError("price-history", error);
}

export async function lookupProductByBarcodeAction(barcode: string) {
  const session = await requirePermission("products.read");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, barcode, selling_price, cost_price, unit, status")
    .eq("business_id", session.businessId)
    .eq("barcode", barcode.trim())
    .maybeSingle();
  return data;
}
