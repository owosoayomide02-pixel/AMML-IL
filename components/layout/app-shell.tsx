"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import type { Profile } from "@/types";
import { useState } from "react";

export function AppShell({
  profile,
  unreadAlerts,
  children,
}: {
  profile: Profile;
  unreadAlerts: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      {open ? (
        <button className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />
      ) : null}
      <Sidebar role={profile.role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav profile={profile} unreadAlerts={unreadAlerts} onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
