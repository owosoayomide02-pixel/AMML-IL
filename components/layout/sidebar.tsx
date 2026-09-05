"use client";

import { BrandLockup } from "@/components/brand/logo";
import { can, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";
import type { Role } from "@/types";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:static",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "transition-transform",
      )}
    >
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard" className="min-w-0">
          <BrandLockup compact />
        </Link>
        <button className="rounded-lg p-1 lg:hidden" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-8">
        {navigation.map((section) => {
          const items = section.items.filter((item) => !item.permission || can(role, item.permission as Permission));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                        active
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
