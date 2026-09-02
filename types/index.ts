export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserStatus = "active" | "invited" | "disabled";
export type ProductStatus = "active" | "archived";
export type WarehouseStatus = "active" | "disabled";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PurchaseStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";
export type SaleStatus = "draft" | "confirmed" | "completed" | "cancelled";
export type TransferStatus = "draft" | "pending" | "in_transit" | "completed" | "cancelled";
export type CountStatus = "draft" | "in_progress" | "pending_approval" | "approved" | "cancelled";
export type AlertSeverity = "info" | "warning" | "critical";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "mobile_money" | "other";

export type StockTransactionType =
  | "opening_stock"
  | "stock_in"
  | "stock_out"
  | "sale"
  | "purchase"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out"
  | "return_in"
  | "return_out"
  | "damaged"
  | "expired";

export type Role = "owner" | "admin" | "manager" | "storekeeper" | "sales_staff" | "viewer";

export interface Profile {
  id: string;
  business_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  business_name: string;
  business_email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currency: string;
  logo_url: string | null;
  tax_number: string | null;
  owner_id: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  manufacturer: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock_level: number;
  reorder_quantity: number;
  image_url: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  supplier_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  tax_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  business_id: string;
  name: string;
  code: string;
  address: string | null;
  description: string | null;
  status: WarehouseStatus;
  created_at: string;
  updated_at: string;
}

export interface InventoryRow {
  id: string;
  business_id: string;
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  business_id: string;
  product_id: string;
  warehouse_id: string;
  transaction_type: StockTransactionType;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  business_id: string;
  supplier_id: string | null;
  purchase_number: string;
  purchase_date: string;
  expected_delivery_date: string | null;
  status: PurchaseStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  received_quantity: number;
  cost_price: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  customer_id: string | null;
  invoice_number: string;
  sale_date: string;
  status: SaleStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  business_id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: TransferStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
}

export interface InventoryCount {
  id: string;
  business_id: string;
  warehouse_id: string;
  count_number: string;
  count_date: string;
  status: CountStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface InventoryCountItem {
  id: string;
  inventory_count_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  reason: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  business_id: string;
  type: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  related_product_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  business_id: string;
  setting_key: string;
  setting_value: Json;
  created_at: string;
  updated_at: string;
}

export interface SessionContext {
  userId: string;
  email: string;
  profile: Profile;
  business: Business | null;
  role: Role;
}
