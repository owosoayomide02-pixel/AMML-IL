"use client";

import { createProductAction, updateProductAction } from "@/app/actions/catalog";
import { BarcodeLookup } from "@/components/barcode/barcode-lookup";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { DualPriceInput } from "@/components/ui/dual-price-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_USD_NGN_RATE } from "@/lib/money";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/lib/config";
import { STOCK_SHEET_LABELS } from "@/lib/stock-sheet";
import { productSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function ProductForm({
  categories,
  defaultValues,
  productId,
  usdNgnRate = DEFAULT_USD_NGN_RATE,
}: {
  categories: Array<{ id: string; name: string }>;
  usdNgnRate?: number;
  defaultValues?: Partial<{
    name: string;
    sku: string;
    barcode: string;
    categoryId: string;
    brand: string;
    manufacturer: string;
    description: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    minimumStockLevel: number;
    reorderQuantity: number;
    imageUrl: string;
    itemCode: string;
    condition: string;
    rackNumber: string;
    remarks: string;
    orderStatus: string;
  }>;
  productId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      sku: defaultValues?.sku ?? "",
      barcode: defaultValues?.barcode ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      brand: defaultValues?.brand ?? "",
      manufacturer: defaultValues?.manufacturer ?? "",
      description: defaultValues?.description ?? "",
      unit: defaultValues?.unit ?? appConfig.defaultUnit,
      costPrice: defaultValues?.costPrice ?? 0,
      sellingPrice: defaultValues?.sellingPrice ?? 0,
      minimumStockLevel: defaultValues?.minimumStockLevel ?? 0,
      reorderQuantity: defaultValues?.reorderQuantity ?? 0,
      imageUrl: defaultValues?.imageUrl ?? "",
      itemCode: defaultValues?.itemCode ?? "",
      condition: defaultValues?.condition ?? "NEW",
      rackNumber: defaultValues?.rackNumber ?? "",
      remarks: defaultValues?.remarks ?? "",
      orderStatus: defaultValues?.orderStatus ?? "",
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => {
        setError("");
        const result = productId
          ? await updateProductAction(productId, values)
          : await createProductAction(values);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success(productId ? "Spare updated" : "Spare created");
        router.push(`/products/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div className="md:col-span-2">
          <Label>{STOCK_SHEET_LABELS.description}</Label>
          <Input {...form.register("name")} />
          <FieldError message={form.formState.errors.name?.message} />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.itemId}</Label>
          <Input {...form.register("itemCode")} placeholder="Leave blank to number automatically" />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.make}</Label>
          <Input {...form.register("brand")} placeholder="SIEMENS, PILZ, EATON..." />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.partNumber}</Label>
          <Input {...form.register("sku")} placeholder="Leave blank to generate" />
        </div>
        <div>
          <Label>Barcode</Label>
          <div className="flex gap-2">
            <Input {...form.register("barcode")} placeholder="Type or scan" />
            <BarcodeLookup
              compact
              onCode={(code) => form.setValue("barcode", code, { shouldDirty: true })}
              onFound={(product) => {
                if (productId && product.id !== productId) {
                  toast.error(`${product.name} already uses this barcode.`);
                  return;
                }
                form.setValue("barcode", product.barcode || product.sku, { shouldDirty: true });
              }}
            />
          </div>
        </div>
        <div>
          <Label>Category</Label>
          <Select {...form.register("categoryId")}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Unit</Label>
          <Input {...form.register("unit")} />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.condition}</Label>
          <Select {...form.register("condition")}>
            <option value="NEW">NEW</option>
            <option value="USED">USED</option>
            <option value="REFURBISHED">REFURBISHED</option>
          </Select>
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.rackNumber}</Label>
          <Input {...form.register("rackNumber")} />
        </div>
        <div>
          <Label>Manufacturer</Label>
          <Input {...form.register("manufacturer")} />
        </div>
        <div>
          <DualPriceInput
            label={STOCK_SHEET_LABELS.unitPrice}
            name="costPrice"
            naira={Number(form.watch("costPrice") || 0)}
            onNairaChange={(value) => form.setValue("costPrice", value, { shouldValidate: true })}
            rate={usdNgnRate}
          />
          <FieldError message={form.formState.errors.costPrice?.message} />
        </div>
        <div>
          <DualPriceInput
            label="Selling price"
            name="sellingPrice"
            naira={Number(form.watch("sellingPrice") || 0)}
            onNairaChange={(value) => form.setValue("sellingPrice", value, { shouldValidate: true })}
            rate={usdNgnRate}
          />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.reorderLevel}</Label>
          <Input type="number" step="0.01" {...form.register("minimumStockLevel")} />
        </div>
        <div>
          <Label>Reorder quantity</Label>
          <Input type="number" step="0.01" {...form.register("reorderQuantity")} />
        </div>
        <div>
          <Label>{STOCK_SHEET_LABELS.orderStatus}</Label>
          <Input {...form.register("orderStatus")} placeholder="Ordered, pending, on the way..." />
        </div>
        <div className="md:col-span-2">
          <Label>{STOCK_SHEET_LABELS.remarks}</Label>
          <Textarea {...form.register("remarks")} placeholder="Stock Good, Reorder needed, or a custom note" />
        </div>
        <div className="md:col-span-2">
          <Label>Extra notes</Label>
          <Textarea {...form.register("description")} />
        </div>
      </FormGrid>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button loading={form.formState.isSubmitting}>{productId ? "Save changes" : "Create spare"}</Button>
    </form>
  );
}
