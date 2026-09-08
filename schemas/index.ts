import { z } from "zod";
import { ROLES } from "@/lib/permissions";

const money = z.coerce.number().min(0, "Amount cannot be negative");
const qty = z.coerce.number().positive("Quantity must be greater than zero");
const optionalEmail = z
  .string()
  .email("Enter a valid email")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingBusinessSchema = z.object({
  businessName: z.string().min(2, "Enter a business name"),
  businessEmail: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
});

export const onboardingLocationSchema = z.object({
  country: z.string().min(2, "Select a country"),
  city: z.string().optional(),
  state: z.string().optional(),
  currency: z.string().min(3).max(3),
});

export const warehouseSchema = z.object({
  name: z.string().min(2, "Enter a warehouse name"),
  code: z.string().min(1, "Enter a warehouse code").max(20),
  address: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "disabled"]).default("active"),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Enter a category name"),
  description: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Enter a spare description"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, "Enter a unit"),
  costPrice: money,
  sellingPrice: money,
  minimumStockLevel: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  imageUrl: z.string().optional(),
  itemCode: z.string().optional(),
  condition: z.string().optional(),
  rackNumber: z.string().optional(),
  remarks: z.string().optional(),
  orderStatus: z.string().optional(),
});

export const supplierSchema = z.object({
  supplierName: z.string().min(2, "Enter a supplier name"),
  contactPerson: z.string().optional(),
  email: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const customerSchema = z.object({
  customerName: z.string().min(2, "Enter a customer name"),
  email: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const stockInSchema = z.object({
  productId: z.string().uuid("Select a product"),
  warehouseId: z.string().uuid("Select a warehouse"),
  quantity: qty,
  unitCost: money,
  supplierId: z.string().uuid().optional().or(z.literal("")),
  reference: z.string().optional(),
  reason: z.string().min(1, "Enter a reason"),
  notes: z.string().optional(),
  transactionType: z.enum(["opening_stock", "stock_in", "return_in"]).default("stock_in"),
});

export const stockOutSchema = z.object({
  productId: z.string().uuid("Select a product"),
  warehouseId: z.string().uuid("Select a warehouse"),
  quantity: qty,
  reason: z.string().min(1, "Enter a reason"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  transactionType: z.enum(["stock_out", "damaged", "expired", "return_out"]).default("stock_out"),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid("Select a warehouse"),
  quantity: qty,
  direction: z.enum(["in", "out"]),
  reason: z.string().min(1, "Enter a reason"),
  notes: z.string().optional(),
});

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: qty,
  costPrice: money,
  tax: money.default(0),
  discount: money.default(0),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional().or(z.literal("")),
  purchaseDate: z.string().min(1),
  expectedDeliveryDate: z.string().optional(),
  tax: money.default(0),
  discount: money.default(0),
  amountPaid: money.default(0),
  notes: z.string().optional(),
  status: z.enum(["draft", "ordered"]).default("draft"),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

export const receivePurchaseSchema = z.object({
  purchaseId: z.string().uuid(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.coerce.number().min(0),
    }),
  ),
});

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: qty,
  sellingPrice: money,
  tax: money.default(0),
  discount: money.default(0),
});

export const saleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")),
  saleDate: z.string().min(1),
  tax: money.default(0),
  discount: money.default(0),
  amountPaid: money.default(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "mobile_money", "other"]).optional(),
  notes: z.string().optional(),
  confirm: z.boolean().default(true),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
});

export const transferSchema = z.object({
  fromWarehouseId: z.string().uuid("Select source warehouse"),
  toWarehouseId: z.string().uuid("Select destination warehouse"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: qty,
      }),
    )
    .min(1, "Add at least one item"),
});

export const countItemSchema = z.object({
  productId: z.string().uuid(),
  countedQuantity: z.coerce.number().min(0),
  reason: z.string().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email"),
  fullName: z.string().min(2, "Enter a name"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES).refine((role) => role !== "owner", {
    message: "Ownership cannot be assigned this way",
  }),
});

export const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
});

export const businessSettingsSchema = z.object({
  businessName: z.string().min(2),
  businessEmail: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  taxNumber: z.string().optional(),
  currency: z.string().min(3).max(3),
});

export const inventorySettingsSchema = z.object({
  defaultWarehouseId: z.string().uuid().optional().or(z.literal("")),
  allowNegativeInventory: z.boolean(),
  defaultUnit: z.string().min(1),
  skuPrefix: z.string().min(1),
  lowStockAlerts: z.boolean(),
  usdNgnRate: z.coerce.number().min(1, "Enter naira per 1 US dollar"),
});

export const salesSettingsSchema = z.object({
  invoicePrefix: z.string().min(1),
  defaultTax: money,
});

export const purchaseSettingsSchema = z.object({
  purchasePrefix: z.string().min(1),
});

export const profileSettingsSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
