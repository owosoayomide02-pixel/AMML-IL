"use client";

import { createCustomerAction, updateCustomerAction } from "@/app/actions/partners";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function CustomerForm({
  customerId,
  defaultValues,
}: {
  customerId?: string;
  defaultValues?: { customerName: string; email: string; phone: string; address: string; notes: string };
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? { customerName: "", email: "", phone: "", address: "", notes: "" },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = customerId ? await updateCustomerAction(customerId, values) : await createCustomerAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(customerId ? "Customer updated" : "Customer created");
        router.push(`/customers/${result.data}`);
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Name</Label>
          <Input {...form.register("customerName")} />
          <FieldError message={form.formState.errors.customerName?.message} />
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
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea {...form.register("notes")} />
        </div>
      </FormGrid>
      <Button loading={form.formState.isSubmitting}>{customerId ? "Save customer" : "Create customer"}</Button>
    </form>
  );
}
