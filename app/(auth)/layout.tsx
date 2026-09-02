import { appConfig } from "@/lib/config";
import { Boxes } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
        <Link href="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Boxes className="h-5 w-5" />
          </span>
          {appConfig.name}
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-semibold leading-tight">
            Know what you have, where it is, and what it is worth.
          </p>
          <p className="mt-4 text-sm text-slate-300">
            Track products, stock movements, sales, purchases, and warehouses in one professional workspace.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-400">Built for growing businesses.</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
