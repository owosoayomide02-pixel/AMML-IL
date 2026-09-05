"use server";

import { applyStock } from "@/app/actions/stock";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { completeJson, isAiConfigured } from "@/lib/ai/client";
import { syncStockAlerts } from "@/lib/alerts";
import { guessCategory, parseBulkStockText, type BulkStockItem } from "@/lib/bulk-stock";
import { appConfig } from "@/lib/config";
import { writeAuditLog, mapDbError } from "@/lib/db";
import { getErrorMessage, logError } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { generateSku } from "@/lib/utils";
import { revalidatePath } from "next/cache";

function normalizeItems(items: BulkStockItem[]): BulkStockItem[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      sku: item.sku.trim(),
      category: item.category.trim() || guessCategory(item.name),
      brand: item.brand.trim(),
      quantity: Number(item.quantity) || 0,
      costPrice: Number(item.costPrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      minimumStockLevel: Number(item.minimumStockLevel) || 0,
      unit: item.unit.trim() || appConfig.defaultUnit,
    }))
    .filter((item) => item.name.length >= 2)
    .slice(0, 200);
}

export async function sortBulkStockAction(raw: string): Promise<ActionResult<{ items: BulkStockItem[]; usedAi: boolean }>> {
  try {
    await requirePermission("products.write");
    const parsed = parseBulkStockText(raw);
    if (parsed.length === 0) return fail("No products found. Paste one item per line or upload a CSV.");

    if (isAiConfigured()) {
      try {
        const sorted = await completeJson<{ items?: BulkStockItem[] }>(
          `Sort this inventory list for an industrial automation spare-parts company. Return JSON { items: [{ name, sku, category, brand, quantity, costPrice, sellingPrice, minimumStockLevel, unit }] }. Keep every real product. Invent a short SKU only if missing. Use categories like Automation, Switchgear, Sensors, Cables, Drives, Pneumatics, General. Do not invent quantities or prices — use 0 if unknown. Unit default pcs.`,
          JSON.stringify({ existing: parsed }),
        );
        if (sorted?.items?.length) {
          return ok({ items: normalizeItems(sorted.items), usedAi: true });
        }
      } catch (error) {
        logError("bulk-stock-ai", error);
      }
    }

    return ok({ items: normalizeItems(parsed), usedAi: false });
  } catch (error) {
    logError("sort-bulk-stock", error);
    return fail(getErrorMessage(error, "Unable to sort that list."));
  }
}

export async function importBulkStockAction(input: {
  warehouseId: string;
  items: BulkStockItem[];
}): Promise<ActionResult<{ created: number; restocked: number; failed: number }>> {
  try {
    const session = await requirePermission("products.write");
    if (!input.warehouseId) return fail("Choose a warehouse for opening stock.");
    const items = normalizeItems(input.items);
    if (items.length === 0) return fail("Add at least one product.");

    const supabase = await createClient();
    const [{ data: categories }, { data: existing }, { count }] = await Promise.all([
      supabase.from("categories").select("id, name").eq("business_id", session.businessId),
      supabase.from("products").select("id, sku").eq("business_id", session.businessId),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", session.businessId),
    ]);

    const categoryByName = new Map((categories ?? []).map((row) => [row.name.toLowerCase(), row.id]));
    const productBySku = new Map((existing ?? []).map((row) => [row.sku.toLowerCase(), row.id]));
    let sequence = (count ?? 0) + 1;
    let created = 0;
    let restocked = 0;
    let failed = 0;

    for (const item of items) {
      try {
        let categoryId = item.category ? categoryByName.get(item.category.toLowerCase()) : undefined;
        if (item.category && !categoryId) {
          const { data: category, error } = await supabase
            .from("categories")
            .insert({ business_id: session.businessId, name: item.category })
            .select("id, name")
            .single();
          if (error || !category) throw error;
          categoryId = category.id;
          categoryByName.set(category.name.toLowerCase(), category.id);
        }

        const sku = item.sku || generateSku(item.name, sequence);
        sequence += 1;
        const existingId = productBySku.get(sku.toLowerCase());

        if (existingId) {
          if (item.quantity > 0) {
            await applyStock({
              businessId: session.businessId,
              userId: session.userId,
              productId: existingId,
              warehouseId: input.warehouseId,
              type: "stock_in",
              quantity: item.quantity,
              unitCost: item.costPrice || null,
              reason: "Bulk stock import",
            });
            restocked += 1;
          }
          continue;
        }

        const { data: product, error } = await supabase
          .from("products")
          .insert({
            business_id: session.businessId,
            category_id: categoryId ?? null,
            sku,
            name: item.name,
            brand: item.brand || null,
            unit: item.unit || appConfig.defaultUnit,
            cost_price: item.costPrice,
            selling_price: item.sellingPrice,
            minimum_stock_level: item.minimumStockLevel,
            reorder_quantity: item.quantity || item.minimumStockLevel,
          })
          .select("id")
          .single();
        if (error || !product) throw new Error(mapDbError(error?.message ?? "") ?? "Unable to create product.");

        productBySku.set(sku.toLowerCase(), product.id);
        await supabase.from("product_price_history").insert({
          business_id: session.businessId,
          product_id: product.id,
          cost_price: item.costPrice,
          selling_price: item.sellingPrice,
          changed_by: session.userId,
        });
        created += 1;

        if (item.quantity > 0) {
          await applyStock({
            businessId: session.businessId,
            userId: session.userId,
            productId: product.id,
            warehouseId: input.warehouseId,
            type: "opening_stock",
            quantity: item.quantity,
            unitCost: item.costPrice || null,
            reason: "Bulk opening stock",
          });
        }
      } catch (error) {
        logError("bulk-stock-row", error);
        failed += 1;
      }
    }

    await writeAuditLog(supabase, {
      businessId: session.businessId,
      userId: session.userId,
      action: "bulk_stock_imported",
      entityType: "product",
      newValues: { created, restocked, failed },
    });
    await syncStockAlerts(session.businessId);
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    return ok({ created, restocked, failed });
  } catch (error) {
    logError("import-bulk-stock", error);
    return fail(getErrorMessage(error, "Unable to import that stock list."));
  }
}
