"use client";

import { stockOutAction } from "@/app/actions/stock";
import { BarcodeLookup } from "@/components/barcode/barcode-lookup";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { stockOutSchema } from "@/schemas";
import { formatSpareOption } from "@/lib/stock-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function StockOutForm({
  products,
  warehouses,
}: {
  products: Array<{ id: string; name: string; sku: string; brand?: string | null }>;
  warehouses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      productId: "",
      warehouseId: warehouses[0]?.id ?? "",
      quantity: 1,
      reason: "Issued stock",
      reference: "",
      notes: "",
      transactionType: "stock_out" as const,
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await stockOutAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Stock issued");
        form.reset({ ...form.getValues(), quantity: 1, notes: "", reference: "" });
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>SPARES DESCRIPTION</Label>
          <div className="flex gap-2">
            <Select className="flex-1" {...form.register("productId")}>
              <option value="">Select spare</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {formatSpareOption(product)}
                </option>
              ))}
            </Select>
            <BarcodeLookup
              compact
              onFound={(product) => form.setValue("productId", product.id, { shouldValidate: true })}
            />
          </div>
          <FieldError message={form.formState.errors.productId?.message} />
        </div>
        <div>
          <Label>LOCATION</Label>
          <Select {...form.register("warehouseId")}>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>STOCK LEVEL</Label>
          <Input type="number" step="0.01" {...form.register("quantity")} />
          <FieldError message={form.formState.errors.quantity?.message} />
        </div>
        <div>
          <Label>Type</Label>
          <Select {...form.register("transactionType")}>
            <option value="stock_out">Stock out</option>
            <option value="damaged">Damaged</option>
            <option value="expired">Expired</option>
            <option value="return_out">Return out</option>
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
      <Button loading={form.formState.isSubmitting}>Record stock out</Button>
    </form>
  );
}
