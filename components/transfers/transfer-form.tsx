"use client";

import { createTransferAction } from "@/app/actions/transfers";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { transferSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

export function TransferForm({
  warehouses,
  products,
}: {
  warehouses: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; sku: string }>;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWarehouseId: warehouses[0]?.id ?? "",
      toWarehouseId: warehouses[1]?.id ?? warehouses[0]?.id ?? "",
      notes: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await createTransferAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Transfer created");
        router.push(`/transfers/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>From</Label>
          <Select {...form.register("fromWarehouseId")}>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>To</Label>
          <Select {...form.register("toWarehouseId")}>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
      </FormGrid>
      {items.fields.map((field, index) => (
        <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_8rem_auto]">
          <Select {...form.register(`items.${index}.productId`)}>
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => items.remove(index)} disabled={items.fields.length === 1}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <FieldError message={form.formState.errors.items?.message as string | undefined} />
      <div>
        <Label>Notes</Label>
        <Textarea {...form.register("notes")} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => items.append({ productId: "", quantity: 1 })}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
        <Button loading={form.formState.isSubmitting}>Create transfer</Button>
      </div>
    </form>
  );
}
