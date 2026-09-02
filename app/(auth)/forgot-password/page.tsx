"use client";

import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500">We will email you a secure reset link.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setServerError("");
          setMessage("");
          const result = await forgotPasswordAction(values);
          if (!result.ok) {
            setServerError(result.error);
            return;
          }
          setMessage(result.data.message);
        })}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        {serverError ? <p className="text-sm text-rose-600">{serverError}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <Button className="w-full" loading={form.formState.isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
