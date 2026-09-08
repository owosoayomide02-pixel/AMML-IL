import type { Permission } from "@/lib/permissions";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Tags,
  ScrollText,
  UserCircle,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.read" }],
  },
  {
    title: "Inventory",
    items: [
      { href: "/products", label: "Spares", icon: Package, permission: "products.read" },
      { href: "/products/import", label: "Bulk add stock", icon: PackagePlus, permission: "products.write" },
      { href: "/categories", label: "Categories", icon: Tags, permission: "categories.read" },
      { href: "/inventory", label: "Stock Overview", icon: Boxes, permission: "inventory.read" },
      { href: "/stock/in", label: "Stock In", icon: ArrowDownToLine, permission: "stock.in" },
      { href: "/stock/out", label: "Stock Out", icon: ArrowUpFromLine, permission: "stock.out" },
      { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "transfers.read" },
      { href: "/counts", label: "Stock counts", icon: ClipboardList, permission: "counts.read" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/sales", label: "Sales", icon: ShoppingCart, permission: "sales.read" },
      { href: "/sales/new", label: "New Sale", icon: FileText, permission: "sales.write" },
      { href: "/customers", label: "Customers", icon: UserCircle, permission: "customers.read" },
    ],
  },
  {
    title: "Purchases",
    items: [
      { href: "/purchases", label: "Purchase Orders", icon: Truck, permission: "purchases.read" },
      { href: "/purchases/new", label: "New Purchase", icon: FileText, permission: "purchases.write" },
      { href: "/suppliers", label: "Suppliers", icon: Building2, permission: "suppliers.read" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/warehouses", label: "Locations", icon: Warehouse, permission: "warehouses.read" },
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.read" },
      { href: "/alerts", label: "Alerts", icon: Bell, permission: "alerts.read" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/users", label: "Users", icon: Users, permission: "users.read" },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "audit.read" },
      { href: "/settings", label: "Settings", icon: Settings, permission: "settings.read" },
    ],
  },
];
