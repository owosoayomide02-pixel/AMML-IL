import type { AlertSeverity, CountStatus, PaymentStatus, ProductStatus, PurchaseStatus, SaleStatus, TransferStatus, UserStatus, WarehouseStatus } from "@/types";
import { stockStatus } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "brand";

export function statusVariant(
  status: ProductStatus | WarehouseStatus | UserStatus | PurchaseStatus | SaleStatus | TransferStatus | CountStatus | PaymentStatus | AlertSeverity | ReturnType<typeof stockStatus> | string,
): BadgeVariant {
  switch (status) {
    case "active":
    case "completed":
    case "received":
    case "approved":
    case "paid":
    case "in_stock":
    case "success":
    case "info":
      return status === "info" ? "info" : "success";
    case "draft":
    case "invited":
    case "pending":
    case "pending_approval":
    case "in_progress":
    case "ordered":
    case "confirmed":
    case "partial":
    case "partially_received":
    case "in_transit":
    case "low":
    case "warning":
      return "warning";
    case "disabled":
    case "archived":
    case "cancelled":
    case "unpaid":
    case "out_of_stock":
    case "critical":
    case "danger":
      return "danger";
    default:
      return "default";
  }
}

export function humanizeStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
