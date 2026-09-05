"use client";

import {
  completeOnboardingAction,
  createBusinessAction,
  createOnboardingCategoryAction,
  createOnboardingProductAction,
  createOnboardingWarehouseAction,
  saveOnboardingLocationAction,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { appConfig } from "@/lib/config";
import { useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD", "INR"];

export function OnboardingFlow({
  initialStep,
  categoryId,
}: {
  initialStep: number;
  categoryId?: string;
}) {
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedCategoryId, setSavedCategoryId] = useState(categoryId ?? "");

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, next?: number) {
    setError("");
    setLoading(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (next) setStep(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <p className="text-sm font-medium text-brand-600">Step {step} of 6</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-brand-600" style={{ width: `${(step / 6) * 100}%` }} />
      </div>

      {step === 1 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const result = await createBusinessAction({
                businessName: String(form.get("businessName") ?? ""),
                businessEmail: String(form.get("businessEmail") ?? ""),
                phone: String(form.get("phone") ?? ""),
                address: String(form.get("address") ?? ""),
                taxNumber: String(form.get("taxNumber") ?? ""),
              });
              return result.ok ? { ok: true } : result;
            }, 2);
          }}
        >
          <h1 className="text-2xl font-semibold">Tell us about your business</h1>
          <div>
            <Label>Business name</Label>
            <Input name="businessName" required />
          </div>
          <div>
            <Label>Business email</Label>
            <Input name="businessEmail" type="email" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" />
          </div>
          <div>
            <Label>Address</Label>
            <Input name="address" />
          </div>
          <div>
            <Label>Tax number</Label>
            <Input name="taxNumber" />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button loading={loading}>Continue</Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const result = await saveOnboardingLocationAction({
                country: String(form.get("country") ?? ""),
                city: String(form.get("city") ?? ""),
                state: String(form.get("state") ?? ""),
                currency: String(form.get("currency") ?? "USD"),
              });
              return result.ok ? { ok: true } : result;
            }, 3);
          }}
        >
          <h1 className="text-2xl font-semibold">Currency and country</h1>
          <div>
            <Label>Country</Label>
            <Input name="country" defaultValue={appConfig.defaultCountry} required />
          </div>
          <div>
            <Label>City</Label>
            <Input name="city" />
          </div>
          <div>
            <Label>State / region</Label>
            <Input name="state" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select name="currency" defaultValue={appConfig.defaultCurrency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button loading={loading}>Continue</Button>
        </form>
      ) : null}

      {step === 3 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const result = await createOnboardingWarehouseAction({
                name: String(form.get("name") ?? ""),
                code: String(form.get("code") ?? ""),
                address: String(form.get("address") ?? ""),
                description: "",
                status: "active",
              });
              return result.ok ? { ok: true } : result;
            }, 4);
          }}
        >
          <h1 className="text-2xl font-semibold">Create your first warehouse</h1>
          <div>
            <Label>Warehouse name</Label>
            <Input name="name" defaultValue="Main Warehouse" required />
          </div>
          <div>
            <Label>Code</Label>
            <Input name="code" defaultValue="MAIN" required />
          </div>
          <div>
            <Label>Address</Label>
            <Input name="address" />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button loading={loading}>Continue</Button>
        </form>
      ) : null}

      {step === 4 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const result = await createOnboardingCategoryAction({
                name: String(form.get("name") ?? ""),
                description: String(form.get("description") ?? ""),
              });
              if (result.ok) setSavedCategoryId(result.data);
              return result.ok ? { ok: true } : result;
            }, 5);
          }}
        >
          <h1 className="text-2xl font-semibold">Create your first category</h1>
          <div>
            <Label>Category name</Label>
            <Input name="name" defaultValue="General" required />
          </div>
          <div>
            <Label>Description</Label>
            <Input name="description" />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button loading={loading}>Continue</Button>
        </form>
      ) : null}

      {step === 5 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const result = await createOnboardingProductAction({
                name: String(form.get("name") ?? ""),
                sku: "",
                unit: appConfig.defaultUnit,
                costPrice: Number(form.get("costPrice") ?? 0),
                sellingPrice: Number(form.get("sellingPrice") ?? 0),
                minimumStockLevel: Number(form.get("minimumStockLevel") ?? 0),
                reorderQuantity: Number(form.get("reorderQuantity") ?? 0),
                categoryId: savedCategoryId || undefined,
              });
              return result.ok ? { ok: true } : result;
            }, 6);
          }}
        >
          <h1 className="text-2xl font-semibold">Add your first product</h1>
          <div>
            <Label>Product name</Label>
            <Input name="name" required />
            <FieldError />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cost price</Label>
              <Input name="costPrice" type="number" step="5000" min="0" defaultValue="0" />
            </div>
            <div>
              <Label>Selling price</Label>
              <Input name="sellingPrice" type="number" step="5000" min="0" defaultValue="0" />
            </div>
            <div>
              <Label>Minimum stock</Label>
              <Input name="minimumStockLevel" type="number" defaultValue="5" />
            </div>
            <div>
              <Label>Reorder quantity</Label>
              <Input name="reorderQuantity" type="number" defaultValue="10" />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button loading={loading}>Save product</Button>
            <Button type="button" variant="secondary" onClick={() => setStep(6)}>
              Skip for now
            </Button>
          </div>
        </form>
      ) : null}

      {step === 6 ? (
        <div className="mt-8 space-y-4">
          <h1 className="text-2xl font-semibold">You are ready</h1>
          <p className="text-sm text-slate-500">
            Your workspace is set up. Open the dashboard to start managing inventory.
          </p>
          <form action={completeOnboardingAction}>
            <Button>Go to dashboard</Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
