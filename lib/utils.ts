import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { appConfig } from "@/lib/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = appConfig.defaultCurrency,
  locale = "en-US",
) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number | string | null | undefined, digits = 2) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function generateDocumentNumber(prefix: string, sequence: number, year = new Date().getFullYear()) {
  const padded = String(sequence).padStart(appConfig.documentNumberPadding, "0");
  return `${prefix}-${year}-${padded}`;
}

export function generateSku(name: string, sequence: number) {
  const slug = name
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 6)
    .toUpperCase() || "ITEM";
  const padded = String(sequence).padStart(4, "0");
  return `${appConfig.skuPrefix}-${slug}-${padded}`;
}

export function stockStatus(available: number, minimum: number) {
  if (available <= 0) return "out_of_stock" as const;
  if (available <= minimum * 0.5) return "critical" as const;
  if (available <= minimum) return "low" as const;
  return "in_stock" as const;
}

export function stockStatusLabel(status: ReturnType<typeof stockStatus>) {
  switch (status) {
    case "out_of_stock":
      return "Out of Stock";
    case "critical":
      return "Critical Stock";
    case "low":
      return "Low Stock";
    default:
      return "In Stock";
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ];
  return lines.join("\n");
}
