"use client";

import { updatePasswordAction } from "@/app/actions/auth";
import {
  updateBusinessSettingsAction,
  updateInventorySettingsAction,
  updateProfileSettingsAction,
  updatePurchaseSettingsAction,
  updateSalesSettingsAction,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  businessSettingsSchema,
  inventorySettingsSchema,
  profileSettingsSchema,
  purchaseSettingsSchema,
  salesSettingsSchema,
} from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SettingsForms({
  canWrite,
  isOwner,
  business,
  profile,
  inventory,
  sales,
  purchases,
  warehouses,
}: {
  canWrite: boolean;
  isOwner: boolean;
  business: {
    businessName: string;
    businessEmail: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    taxNumber: string;
    currency: string;
  };
  profile: { fullName: string; phone: string };
  inventory: {
    defaultWarehouseId: string;
    allowNegativeInventory: boolean;
    defaultUnit: string;
    skuPrefix: string;
    lowStockAlerts: boolean;
    usdNgnRate: number;
  };
  sales: { invoicePrefix: string; defaultTax: number };
  purchases: { purchasePrefix: string };
  warehouses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const businessForm = useForm({ resolver: zodResolver(businessSettingsSchema), defaultValues: business });
  const inventoryForm = useForm({ resolver: zodResolver(inventorySettingsSchema), defaultValues: inventory });
  const salesForm = useForm({ resolver: zodResolver(salesSettingsSchema), defaultValues: sales });
  const purchaseForm = useForm({ resolver: zodResolver(purchaseSettingsSchema), defaultValues: purchases });
  const profileForm = useForm({ resolver: zodResolver(profileSettingsSchema), defaultValues: profile });
  const passwordForm = useForm({ defaultValues: { currentPassword: "", newPassword: "" } });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={profileForm.handleSubmit(async (values) => {
              const result = await updateProfileSettingsAction(values);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Profile saved");
                router.refresh();
              }
            })}
          >
            <FormGrid>
              <div>
                <Label>Full name</Label>
                <Input {...profileForm.register("fullName")} />
                <FieldError message={profileForm.formState.errors.fullName?.message} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...profileForm.register("phone")} />
              </div>
            </FormGrid>
            <Button loading={profileForm.formState.isSubmitting}>Save profile</Button>
          </form>
          <form
            className="mt-6 space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800"
            onSubmit={passwordForm.handleSubmit(async (values) => {
              const result = await updatePasswordAction(values.currentPassword, values.newPassword);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success(result.data);
                passwordForm.reset();
              }
            })}
          >
            <FormGrid>
              <div>
                <Label>Current password</Label>
                <Input type="password" {...passwordForm.register("currentPassword")} />
              </div>
              <div>
                <Label>New password</Label>
                <Input type="password" {...passwordForm.register("newPassword")} />
              </div>
            </FormGrid>
            <Button variant="secondary" loading={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={businessForm.handleSubmit(async (values) => {
              const result = await updateBusinessSettingsAction(values);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Business settings saved");
                router.refresh();
              }
            })}
          >
            <fieldset disabled={!canWrite} className="space-y-4">
              <FormGrid>
                <div>
                  <Label>Business name</Label>
                  <Input {...businessForm.register("businessName")} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input {...businessForm.register("businessEmail")} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...businessForm.register("phone")} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input maxLength={3} {...businessForm.register("currency")} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input {...businessForm.register("country")} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...businessForm.register("city")} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input {...businessForm.register("address")} />
                </div>
                <div>
                  <Label>Tax number</Label>
                  <Input {...businessForm.register("taxNumber")} />
                </div>
              </FormGrid>
              {canWrite ? <Button loading={businessForm.formState.isSubmitting}>Save business</Button> : null}
            </fieldset>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={inventoryForm.handleSubmit(async (values) => {
              const result = await updateInventorySettingsAction(values);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Inventory settings saved");
                router.refresh();
              }
            })}
          >
            <fieldset disabled={!canWrite} className="space-y-4">
              <FormGrid>
                <div>
                  <Label>Default warehouse</Label>
                  <Select {...inventoryForm.register("defaultWarehouseId")}>
                    <option value="">None</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Default unit</Label>
                  <Input {...inventoryForm.register("defaultUnit")} />
                </div>
                <div>
                  <Label>SKU prefix</Label>
                  <Input {...inventoryForm.register("skuPrefix")} />
                </div>
                <div>
                  <Label>Naira per 1 US dollar</Label>
                  <Input type="number" step="1" min="1" {...inventoryForm.register("usdNgnRate")} />
                  <p className="mt-1 text-xs text-slate-400">Used to show prices in both ₦ and $.</p>
                </div>
                <label className="flex items-center gap-2 self-end text-sm">
                  <input type="checkbox" {...inventoryForm.register("lowStockAlerts")} />
                  Low-stock alerts
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={!isOwner} {...inventoryForm.register("allowNegativeInventory")} />
                  Allow negative inventory {isOwner ? "" : "(owner only)"}
                </label>
              </FormGrid>
              {canWrite ? <Button loading={inventoryForm.formState.isSubmitting}>Save inventory</Button> : null}
            </fieldset>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={salesForm.handleSubmit(async (values) => {
                const result = await updateSalesSettingsAction(values);
                if (!result.ok) toast.error(result.error);
                else toast.success("Sales settings saved");
              })}
            >
              <fieldset disabled={!canWrite} className="space-y-4">
                <div>
                  <Label>Invoice prefix</Label>
                  <Input {...salesForm.register("invoicePrefix")} />
                </div>
                <div>
                  <Label>Default tax</Label>
                  <Input type="number" step="0.01" {...salesForm.register("defaultTax")} />
                </div>
                {canWrite ? <Button loading={salesForm.formState.isSubmitting}>Save sales</Button> : null}
              </fieldset>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={purchaseForm.handleSubmit(async (values) => {
                const result = await updatePurchaseSettingsAction(values);
                if (!result.ok) toast.error(result.error);
                else toast.success("Purchase settings saved");
              })}
            >
              <fieldset disabled={!canWrite} className="space-y-4">
                <div>
                  <Label>Purchase prefix</Label>
                  <Input {...purchaseForm.register("purchasePrefix")} />
                </div>
                {canWrite ? <Button loading={purchaseForm.formState.isSubmitting}>Save purchases</Button> : null}
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
