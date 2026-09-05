"use client";

import { createProductAction, updateProductAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { DualPriceInput } from "@/components/ui/dual-price-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_USD_NGN_RATE } from "@/lib/money";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/lib/config";
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
        toast.success(productId ? "Product updated" : "Product created");
        router.push(`/products/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div className="md:col-span-2">
          <Label>Product name</Label>
          <Input {...form.register("name")} />
          <FieldError message={form.formState.errors.name?.message} />
        </div>
        <div>
          <Label>SKU</Label>
          <Input {...form.register("sku")} placeholder="Leave blank to generate" />
        </div>
        <div>
          <Label>Barcode</Label>
          <Input {...form.register("barcode")} />
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
          <Label>Brand</Label>
          <Input {...form.register("brand")} />
        </div>
        <div>
          <Label>Manufacturer</Label>
          <Input {...form.register("manufacturer")} />
        </div>
        <div>
          <DualPriceInput
            label="Cost price"
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
          <Label>Minimum stock level</Label>
          <Input type="number" step="0.01" {...form.register("minimumStockLevel")} />
        </div>
        <div>
          <Label>Reorder quantity</Label>
          <Input type="number" step="0.01" {...form.register("reorderQuantity")} />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea {...form.register("description")} />
        </div>
      </FormGrid>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button loading={form.formState.isSubmitting}>{productId ? "Save changes" : "Create product"}</Button>
    </form>
  );
}
