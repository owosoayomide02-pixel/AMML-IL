"use client";

import { inviteUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import { inviteUserSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function InviteForm() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: "", fullName: "", password: "", role: "viewer" as const },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await inviteUserAction(values);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("User added. They can sign in now.");
        form.reset();
        router.refresh();
      })}
    >
      <FormGrid>
        <div>
          <Label>Full name</Label>
          <Input {...form.register("fullName")} />
          <FieldError message={form.formState.errors.fullName?.message} />
        </div>
        <div>
          <Label>Work email</Label>
          <Input type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        <div>
          <Label>Role</Label>
          <Select {...form.register("role")}>
            {ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
      </FormGrid>
      <Button loading={form.formState.isSubmitting}>Add user</Button>
    </form>
  );
}
