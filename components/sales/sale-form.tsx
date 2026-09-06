"use client";

import { createSaleAction } from "@/app/actions/sales";
import { BarcodeLookup } from "@/components/barcode/barcode-lookup";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { saleSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

export function SaleForm({
  products,
  warehouses,
  customers,
  currency,
}: {
  products: Array<{ id: string; name: string; sku: string; sellingPrice: number }>;
  warehouses: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  currency: string;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerId: "",
      saleDate: new Date().toISOString().slice(0, 10),
      tax: 0,
      discount: 0,
      amountPaid: 0,
      paymentMethod: "cash" as const,
      notes: "",
      confirm: true,
      items: [
        {
          productId: "",
          warehouseId: warehouses[0]?.id ?? "",
          quantity: 1,
          sellingPrice: 0,
          tax: 0,
          discount: 0,
        },
      ],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const values = form.watch();
  const subtotal = values.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.sellingPrice || 0), 0);
  const total = Math.max(0, subtotal + Number(values.tax || 0) - Number(values.discount || 0));

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await createSaleAction(data);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Sale created");
        router.push(`/sales/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Customer</Label>
          <Select {...form.register("customerId")}>
            <option value="">Walk-in</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Sale date</Label>
          <Input type="date" {...form.register("saleDate")} />
        </div>
        <div>
          <Label>Payment method</Label>
          <Select {...form.register("paymentMethod")}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div>
          <Label>Amount paid</Label>
          <Input type="number" step="0.01" {...form.register("amountPaid")} />
        </div>
      </FormGrid>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Items</h3>
          <div className="flex flex-wrap gap-2">
            <BarcodeLookup
              compact
              onFound={(product) => {
                const emptyIndex = values.items.findIndex((item) => !item.productId);
                const line = {
                  productId: product.id,
                  warehouseId: warehouses[0]?.id ?? "",
                  quantity: 1,
                  sellingPrice: product.selling_price,
                  tax: 0,
                  discount: 0,
                };
                if (emptyIndex >= 0) {
                  form.setValue(`items.${emptyIndex}.productId`, product.id);
                  form.setValue(`items.${emptyIndex}.sellingPrice`, product.selling_price);
                } else {
                  items.append(line);
                }
              }}
            />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              items.append({
                productId: "",
                warehouseId: warehouses[0]?.id ?? "",
                quantity: 1,
                sellingPrice: 0,
                tax: 0,
                discount: 0,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
          </div>
        </div>
        {items.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-6 dark:border-slate-800">
            <div className="md:col-span-2">
              <Label>Product</Label>
              <Select
                {...form.register(`items.${index}.productId`, {
                  onChange: (event) => {
                    const product = products.find((row) => row.id === event.target.value);
                    if (product) form.setValue(`items.${index}.sellingPrice`, product.sellingPrice);
                  },
                })}
              >
                <option value="">Select</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Warehouse</Label>
              <Select {...form.register(`items.${index}.warehouseId`)}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Qty</Label>
              <Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" step="5000" min="0" {...form.register(`items.${index}.sellingPrice`)} />
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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("confirm")} className="h-4 w-4" />
        Confirm and deduct stock now
      </label>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
        <p className="text-sm text-slate-500">Invoice total</p>
        <p className="text-lg font-semibold">{formatCurrency(total, currency)}</p>
      </div>
      <Button loading={form.formState.isSubmitting}>Create sale</Button>
    </form>
  );
}
