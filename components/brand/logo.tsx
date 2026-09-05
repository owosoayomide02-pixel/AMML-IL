import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function BrandMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80", className)}
      style={{ width: size + 12, height: size + 12 }}
    >
      <Image
        src="/aaml-mark.png"
        alt={appConfig.shortName}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
      />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80", className)}>
      <Image
        src="/aaml-logo.png"
        alt={`${appConfig.shortName} Automation`}
        width={320}
        height={360}
        className="h-auto w-[9.5rem] max-w-full object-contain object-center sm:w-44"
        priority
      />
    </span>
  );
}

export function BrandLockup({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={compact ? 32 : 36} />
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          {appConfig.shortName}
        </span>
        <span className="block text-[11px] text-slate-500">Automation</span>
      </span>
    </span>
  );
}
