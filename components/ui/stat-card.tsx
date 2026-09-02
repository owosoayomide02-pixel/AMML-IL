import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "text-brand-600 bg-brand-50 dark:bg-brand-950/40",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    danger: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        {icon ? <div className={cn("rounded-xl p-2.5", tones[tone])}>{icon}</div> : null}
      </div>
    </div>
  );
}
