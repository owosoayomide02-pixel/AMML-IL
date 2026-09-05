"use client";

import { createSupplierAction, updateSupplierAction } from "@/app/actions/partners";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supplierSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SupplierForm({
  supplierId,
  defaultValues,
}: {
  supplierId?: string;
  defaultValues?: {
    supplierName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    taxNumber: string;
    notes: string;
  };
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues ?? {
      supplierName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      taxNumber: "",
      notes: "",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = supplierId ? await updateSupplierAction(supplierId, values) : await createSupplierAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(supplierId ? "Supplier updated" : "Supplier created");
        router.push(`/suppliers/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Supplier name</Label>
          <Input {...form.register("supplierName")} />
          <FieldError message={form.formState.errors.supplierName?.message} />
        </div>
        <div>
          <Label>Contact person</Label>
          <Input {...form.register("contactPerson")} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input {...form.register("phone")} />
        </div>
        <div>
          <Label>Address</Label>
          <Input {...form.register("address")} />
        </div>
        <div>
          <Label>City</Label>
          <Input {...form.register("city")} />
        </div>
        <div>
          <Label>State</Label>
          <Input {...form.register("state")} />
        </div>
        <div>
          <Label>Country</Label>
          <Input {...form.register("country")} />
        </div>
        <div>
          <Label>Tax number</Label>
          <Input {...form.register("taxNumber")} />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea {...form.register("notes")} />
        </div>
      </FormGrid>
      <Button loading={form.formState.isSubmitting}>{supplierId ? "Save supplier" : "Create supplier"}</Button>
    </form>
  );
}
