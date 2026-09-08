import "server-only";

import { createClient } from "@/lib/supabase/server";
import { notifyTelegram } from "@/lib/telegram";
import { toNumber } from "@/lib/utils";

export async function syncStockAlerts(businessId: string) {
  const supabase = await createClient();
  const [{ data: products }, { data: inventory }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, brand, minimum_stock_level, status")
      .eq("business_id", businessId)
      .eq("status", "active"),
    supabase.from("inventory").select("product_id, quantity_available").eq("business_id", businessId),
  ]);

  const availableByProduct = new Map<string, number>();
  for (const row of inventory ?? []) {
    availableByProduct.set(row.product_id, (availableByProduct.get(row.product_id) ?? 0) + toNumber(row.quantity_available));
  }

  for (const product of products ?? []) {
    const available = availableByProduct.get(product.id) ?? 0;
    const minimum = toNumber(product.minimum_stock_level);

    if (available > minimum) {
      await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("business_id", businessId)
        .eq("related_product_id", product.id)
        .in("type", ["low_stock", "critical_stock", "out_of_stock"])
        .eq("is_read", false);
      continue;
    }

    const finding =
      available <= 0
        ? {
            type: "out_of_stock",
            severity: "critical" as const,
            title: "Out of Stock",
            message: `${[product.brand, product.name].filter(Boolean).join(" · ")} (${product.sku}) is out of stock.`,
          }
        : available <= minimum * 0.5
          ? {
              type: "critical_stock",
              severity: "critical" as const,
              title: "Critical Stock",
              message: `${[product.brand, product.name].filter(Boolean).join(" · ")} (${product.sku}) is critically low at ${available}.`,
            }
          : {
              type: "low_stock",
              severity: "warning" as const,
              title: "Low Stock",
              message: `${[product.brand, product.name].filter(Boolean).join(" · ")} (${product.sku}) is at or below the re-order level (${available} stock, re-order ${minimum}).`,
            };

    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("business_id", businessId)
      .eq("related_product_id", product.id)
      .eq("type", finding.type)
      .eq("is_read", false)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("alerts").insert({
      business_id: businessId,
      type: finding.type,
      title: finding.title,
      message: finding.message,
      severity: finding.severity,
      related_product_id: product.id,
    });
    if (!error) {
      await notifyTelegram(businessId, `AAML ${finding.title}\n${finding.message}`);
    }
  }
}
