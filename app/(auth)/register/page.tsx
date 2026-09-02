"use client";

import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/lib/config";
import { registerSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create your {appConfig.name} account</h1>
      <p className="mt-1 text-sm text-slate-500">The first account becomes the business Owner.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setServerError("");
          const result = await registerAction(values);
          if (!result.ok) {
            setServerError(result.error);
            return;
          }
          router.push(result.data.redirectTo);
        })}
      >
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register("fullName")} />
          <FieldError message={form.formState.errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
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
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
