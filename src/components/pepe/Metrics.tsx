import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "destructive" | "primary";
}) {
  const toneCls = {
    default: "",
    success: "border-success/40 bg-success/5",
    destructive: "border-destructive/40 bg-destructive/5",
    primary: "border-primary/40 bg-primary/5",
  }[tone];
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        toneCls,
      )}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="size-4" />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums text-foreground">{value}</span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
