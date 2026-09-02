"use client";

import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/types";

export function TopNav({
  profile,
  unreadAlerts,
  onMenu,
}: {
  profile: Profile;
  unreadAlerts: number;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <Link
        href="/alerts"
        className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Alerts"
      >
        <Bell className="h-5 w-5" />
        {unreadAlerts > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </Link>
      <ThemeToggle />
      <UserMenu profile={profile} />
    </header>
  );
}
