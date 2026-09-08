"use server";

import { requireBusiness } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function searchCatalogAction(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const session = await requireBusiness();
  const supabase = await createClient();
  const like = `%${q}%`;

  const [products, suppliers, customers, purchases, sales] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, barcode, brand")
      .eq("business_id", session.businessId)
      .or(`name.ilike.${like},sku.ilike.${like},barcode.ilike.${like},brand.ilike.${like}`)
      .limit(5),
    supabase
      .from("suppliers")
      .select("id, supplier_name")
      .eq("business_id", session.businessId)
      .ilike("supplier_name", like)
      .limit(5),
    supabase
      .from("customers")
      .select("id, customer_name")
      .eq("business_id", session.businessId)
      .ilike("customer_name", like)
      .limit(5),
    supabase
      .from("purchases")
      .select("id, purchase_number")
      .eq("business_id", session.businessId)
      .ilike("purchase_number", like)
      .limit(5),
    supabase
      .from("sales")
      .select("id, invoice_number")
      .eq("business_id", session.businessId)
      .ilike("invoice_number", like)
      .limit(5),
  ]);

  return [
    ...(products.data ?? []).map((row) => ({
      type: "Spare",
      id: row.id,
      title: row.name,
      subtitle: [row.brand, row.sku].filter(Boolean).join(" · ") || "PART NUMBER",
      href: `/products/${row.id}`,
    })),
    ...(suppliers.data ?? []).map((row) => ({
      type: "Supplier",
      id: row.id,
      title: row.supplier_name,
      subtitle: "Supplier",
      href: `/suppliers/${row.id}`,
    })),
    ...(customers.data ?? []).map((row) => ({
      type: "Customer",
      id: row.id,
      title: row.customer_name,
      subtitle: "Customer",
      href: `/customers/${row.id}`,
    })),
    ...(purchases.data ?? []).map((row) => ({
      type: "Purchase",
      id: row.id,
      title: row.purchase_number,
      subtitle: "Purchase order",
      href: `/purchases/${row.id}`,
    })),
    ...(sales.data ?? []).map((row) => ({
      type: "Sale",
      id: row.id,
      title: row.invoice_number,
      subtitle: "Invoice",
      href: `/sales/${row.id}`,
    })),
  ];
}
