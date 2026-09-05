import { BrandWordmark } from "@/components/brand/logo";
import { appConfig } from "@/lib/config";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(29,69,183,0.35),_transparent_55%)]" />
        <Link href="/" className="relative z-10 inline-flex rounded-2xl shadow-sm">
          <BrandWordmark />
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-semibold uppercase tracking-wide">{appConfig.slogan}</p>
          <p className="mt-4 text-sm text-slate-300">
            Inventory workspace for AAML Automation. Track products, stock, sales, purchases, and warehouses.
            Access is by invitation only.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-400">{appConfig.website.replace("https://", "")}</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-8 inline-flex shadow-sm lg:hidden">
            <BrandWordmark />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
