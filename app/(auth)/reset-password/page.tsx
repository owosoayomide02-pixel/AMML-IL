"use client";

import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Use at least 8 characters.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setServerError("");
          const result = await resetPasswordAction(values);
          if (!result.ok) {
            setServerError(result.error);
            return;
          }
          router.push(result.data.redirectTo);
        })}
      >
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
          <FieldError message={form.formState.errors.confirmPassword?.message} />
        </div>
        {serverError ? <p className="text-sm text-rose-600">{serverError}</p> : null}
        <Button className="w-full" loading={form.formState.isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
