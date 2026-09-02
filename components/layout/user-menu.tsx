"use client";

import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Profile } from "@/types";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {(profile.full_name || profile.email).slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium">{profile.full_name || "Account"}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABELS[profile.role]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <Link
            href="/settings#profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" /> Profile
          </Link>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
