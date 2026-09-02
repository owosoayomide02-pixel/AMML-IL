export const ROLES = [
  "owner",
  "admin",
  "manager",
  "storekeeper",
  "sales_staff",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  storekeeper: "Storekeeper",
  sales_staff: "Sales Staff",
  viewer: "Viewer",
};

export const PERMISSIONS = [
  "dashboard.read",
  "products.read",
  "products.write",
  "categories.read",
  "categories.write",
  "inventory.read",
  "stock.in",
  "stock.out",
  "stock.adjust",
  "transfers.read",
  "transfers.write",
  "counts.read",
  "counts.write",
  "counts.approve",
  "suppliers.read",
  "suppliers.write",
  "purchases.read",
  "purchases.write",
  "purchases.receive",
  "customers.read",
  "customers.write",
  "sales.read",
  "sales.write",
  "warehouses.read",
  "warehouses.write",
  "reports.read",
  "alerts.read",
  "alerts.write",
  "users.read",
  "users.write",
  "audit.read",
  "settings.read",
  "settings.write",
  "settings.ownership",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Role[] = [...ROLES];
const STAFF: Role[] = ["owner", "admin", "manager", "storekeeper", "sales_staff"];
const OPS: Role[] = ["owner", "admin", "manager", "storekeeper"];
const MANAGE: Role[] = ["owner", "admin", "manager"];
const ADMIN: Role[] = ["owner", "admin"];
const OWNER: Role[] = ["owner"];

const ROLE_PERMISSIONS: Record<Permission, Role[]> = {
  "dashboard.read": ALL,
  "products.read": ALL,
  "products.write": OPS,
  "categories.read": ALL,
  "categories.write": MANAGE,
  "inventory.read": ALL,
  "stock.in": OPS,
  "stock.out": OPS,
  "stock.adjust": MANAGE,
  "transfers.read": ALL,
  "transfers.write": OPS,
  "counts.read": ALL,
  "counts.write": OPS,
  "counts.approve": MANAGE,
  "suppliers.read": ALL,
  "suppliers.write": MANAGE,
  "purchases.read": ["owner", "admin", "manager", "storekeeper", "viewer"],
  "purchases.write": MANAGE,
  "purchases.receive": OPS,
  "customers.read": ALL,
  "customers.write": ["owner", "admin", "manager", "sales_staff"],
  "sales.read": ALL,
  "sales.write": ["owner", "admin", "manager", "sales_staff"],
  "warehouses.read": ALL,
  "warehouses.write": MANAGE,
  "reports.read": ["owner", "admin", "manager", "viewer"],
  "alerts.read": ALL,
  "alerts.write": STAFF,
  "users.read": ADMIN,
  "users.write": ADMIN,
  "audit.read": ADMIN,
  "settings.read": ALL,
  "settings.write": ADMIN,
  "settings.ownership": OWNER,
};

export function can(role: Role | string | null | undefined, permission: Permission) {
  if (!role) return false;
  const allowed = ROLE_PERMISSIONS[permission];
  return allowed.includes(role as Role);
}

export function assertCan(role: Role | string | null | undefined, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

export function permissionsFor(role: Role) {
  return PERMISSIONS.filter((permission) => can(role, permission));
}

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}
