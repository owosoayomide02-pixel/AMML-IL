import { SettingsForms } from "@/components/settings/settings-forms";
import { TelegramAlertsCard } from "@/components/settings/telegram-alerts";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { DEFAULT_USD_NGN_RATE } from "@/lib/money";
import { listSettings, listWarehouses } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { getTelegramBot, getTelegramConfig } from "@/lib/telegram";

export default async function SettingsPage() {
  const { session, allowed } = await requirePageAccess("settings.read");
  if (!allowed) return <Forbidden />;
  const [settings, warehouses, telegram] = await Promise.all([
    listSettings(session.businessId),
    listWarehouses(session.businessId),
    getTelegramConfig(session.businessId),
  ]);
  let botUsername: string | null = null;
  if (telegram.botToken) {
    try {
      const bot = await getTelegramBot(telegram.botToken);
      botUsername = bot.username ?? null;
    } catch {
      botUsername = null;
    }
  }
  const read = <T,>(key: string, fallback: T) => (settings.get(key) as T | undefined) ?? fallback;

  return (
    <div>
      <PageHeader title="Settings" description="Company profile, inventory rules, Telegram phone alerts, and document prefixes." />
      <div className="space-y-6">
      <TelegramAlertsCard
        canWrite={can(session.role, "settings.write")}
        enabled={telegram.enabled}
        hasToken={Boolean(telegram.botToken)}
        botUsername={botUsername}
        chats={telegram.chats}
      />
      <SettingsForms
        canWrite={can(session.role, "settings.write")}
        isOwner={session.role === "owner"}
        business={{
          businessName: session.business.business_name,
          businessEmail: session.business.business_email ?? "",
          phone: session.business.phone ?? "",
          address: session.business.address ?? "",
          city: session.business.city ?? "",
          state: session.business.state ?? "",
          country: session.business.country ?? "",
          taxNumber: session.business.tax_number ?? "",
          currency: session.business.currency,
        }}
        profile={{
          fullName: session.profile.full_name,
          phone: session.profile.phone ?? "",
        }}
        inventory={{
          defaultWarehouseId: (read<{ id?: string }>("default_warehouse", {}).id as string | undefined) ?? "",
          allowNegativeInventory: Boolean((read<{ enabled?: boolean }>("allow_negative_inventory", { enabled: false })).enabled),
          defaultUnit: (read<{ value?: string }>("default_unit", { value: "pcs" })).value ?? "pcs",
          skuPrefix: (read<{ prefix?: string }>("sku_format", { prefix: "SKU" })).prefix ?? "SKU",
          lowStockAlerts: Boolean((read<{ enabled?: boolean }>("low_stock_alerts", { enabled: true })).enabled),
          usdNgnRate: Number((read<{ rate?: number }>("usd_ngn_rate", { rate: DEFAULT_USD_NGN_RATE })).rate ?? DEFAULT_USD_NGN_RATE),
        }}
        sales={{
          invoicePrefix: (read<{ value?: string }>("invoice_prefix", { value: "INV" })).value ?? "INV",
          defaultTax: Number((read<{ rate?: number }>("default_tax", { rate: 0 })).rate ?? 0),
        }}
        purchases={{
          purchasePrefix: (read<{ value?: string }>("purchase_prefix", { value: "PO" })).value ?? "PO",
        }}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      />
      </div>
    </div>
  );
}
