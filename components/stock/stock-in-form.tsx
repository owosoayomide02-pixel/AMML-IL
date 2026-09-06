"use client";

import { stockInAction } from "@/app/actions/stock";
import { BarcodeLookup } from "@/components/barcode/barcode-lookup";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DualPriceInput } from "@/components/ui/dual-price-input";
import { stockInSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function StockInForm({
  products,
  warehouses,
  suppliers,
}: {
  products: Array<{ id: string; name: string; sku: string }>;
  warehouses: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      productId: "",
      warehouseId: warehouses[0]?.id ?? "",
      quantity: 1,
      unitCost: 0,
      supplierId: "",
      reference: "",
      reason: "Received stock",
      notes: "",
      transactionType: "stock_in" as const,
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await stockInAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Stock recorded");
        form.reset({ ...form.getValues(), quantity: 1, notes: "", reference: "" });
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Product</Label>
          <div className="flex gap-2">
            <Select className="flex-1" {...form.register("productId")}>
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>
            <BarcodeLookup
              compact
              onFound={(product) => {
                form.setValue("productId", product.id, { shouldValidate: true });
                if (product.cost_price) form.setValue("unitCost", product.cost_price);
              }}
            />
          </div>
          <FieldError message={form.formState.errors.productId?.message} />
        </div>
        <div>
          <Label>Warehouse</Label>
          <Select {...form.register("warehouseId")}>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Quantity</Label>
          <Input type="number" step="0.01" {...form.register("quantity")} />
          <FieldError message={form.formState.errors.quantity?.message} />
        </div>
        <div>
          <DualPriceInput
            label="Unit cost"
            naira={Number(form.watch("unitCost") || 0)}
            onNairaChange={(value) => form.setValue("unitCost", value, { shouldValidate: true })}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select {...form.register("transactionType")}>
            <option value="stock_in">Stock in</option>
            <option value="opening_stock">Opening stock</option>
            <option value="return_in">Return in</option>
          </Select>
        </div>
        <div>
          <Label>Supplier</Label>
          <Select {...form.register("supplierId")}>
            <option value="">None</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Reason</Label>
          <Input {...form.register("reason")} />
          <FieldError message={form.formState.errors.reason?.message} />
        </div>
        <div>
          <Label>Reference</Label>
          <Input {...form.register("reference")} />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea {...form.register("notes")} />
        </div>
      </FormGrid>
      <Button loading={form.formState.isSubmitting}>Record stock in</Button>
    </form>
  );
}
