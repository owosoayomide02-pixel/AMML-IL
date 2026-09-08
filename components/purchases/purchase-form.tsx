"use client";

import { createPurchaseAction } from "@/app/actions/purchases";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { formatSpareOption } from "@/lib/stock-sheet";
import { purchaseSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

export function PurchaseForm({
  products,
  warehouses,
  suppliers,
  currency,
}: {
  products: Array<{ id: string; name: string; sku: string; brand?: string | null; costPrice: number }>;
  warehouses: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  currency: string;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: "",
      tax: 0,
      discount: 0,
      amountPaid: 0,
      notes: "",
      status: "draft" as const,
      items: [
        {
          productId: "",
          warehouseId: warehouses[0]?.id ?? "",
          quantity: 1,
          costPrice: 0,
          tax: 0,
          discount: 0,
        },
      ],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const values = form.watch();
  const subtotal = values.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.costPrice || 0), 0);
  const total = Math.max(0, subtotal + Number(values.tax || 0) - Number(values.discount || 0));

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await createPurchaseAction(data);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Purchase created");
        router.push(`/purchases/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Supplier</Label>
          <Select {...form.register("supplierId")}>
            <option value="">Unassigned</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Purchase date</Label>
          <Input type="date" {...form.register("purchaseDate")} />
        </div>
        <div>
          <Label>Expected delivery</Label>
          <Input type="date" {...form.register("expectedDeliveryDate")} />
        </div>
        <div>
          <Label>Status</Label>
          <Select {...form.register("status")}>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
          </Select>
        </div>
        <div>
          <Label>Amount paid</Label>
          <Input type="number" step="0.01" {...form.register("amountPaid")} />
        </div>
      </FormGrid>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Items</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              items.append({
                productId: "",
                warehouseId: warehouses[0]?.id ?? "",
                quantity: 1,
                costPrice: 0,
                tax: 0,
                discount: 0,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
        {items.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-6 dark:border-slate-800">
            <div className="md:col-span-2">
              <Label>SPARES DESCRIPTION</Label>
              <Select
                {...form.register(`items.${index}.productId`, {
                  onChange: (event) => {
                    const product = products.find((row) => row.id === event.target.value);
                    if (product) form.setValue(`items.${index}.costPrice`, product.costPrice);
                  },
                })}
              >
                <option value="">Select spare</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {formatSpareOption(product)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>LOCATION</Label>
              <Select {...form.register(`items.${index}.warehouseId`)}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>STOCK LEVEL</Label>
              <Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} />
            </div>
            <div>
              <Label>UNIT PRICE</Label>
              <Input type="number" step="5000" min="0" {...form.register(`items.${index}.costPrice`)} />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => items.remove(index)} disabled={items.fields.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <FieldError message={form.formState.errors.items?.message as string | undefined} />
      </div>

      <FormGrid>
        <div>
          <Label>Tax</Label>
          <Input type="number" step="0.01" {...form.register("tax")} />
        </div>
        <div>
          <Label>Discount</Label>
          <Input type="number" step="0.01" {...form.register("discount")} />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea {...form.register("notes")} />
        </div>
      </FormGrid>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
        <p className="text-sm text-slate-500">Order total</p>
        <p className="text-lg font-semibold">{formatCurrency(total, currency)}</p>
      </div>
      <Button loading={form.formState.isSubmitting}>Create purchase</Button>
    </form>
  );
}
