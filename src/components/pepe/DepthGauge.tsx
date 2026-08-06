import { usePepe } from "@/lib/pepe-store";
import { cn } from "@/lib/utils";

export function DepthGauge() {
  const { state, params } = usePepe();
  const cm = state.ultimaCompresion ?? 0;
  const max = Math.max(state.lecturaMaximaCMPresion, params.objetivoProfundidadMax + 1.5);
  const pct = Math.min(100, (cm / max) * 100);
  const minPct = (params.objetivoProfundidadMin / max) * 100;
  const maxPct = (params.objetivoProfundidadMax / max) * 100;
  const inRange =
    cm >= params.objetivoProfundidadMin && cm <= params.objetivoProfundidadMax;
  const tooShallow = cm > 0 && cm < params.objetivoProfundidadMin;
  const tooDeep = cm > params.objetivoProfundidadMax;

  const label = cm === 0
    ? "En espera"
    : inRange
      ? "Profundidad correcta"
      : tooShallow
        ? "Comprimí más fuerte"
        : tooDeep
          ? "Comprimí más suave"
          : "";

  const color = inRange
    ? "text-success"
    : tooDeep
      ? "text-destructive-text"
      : tooShallow
        ? "text-warning-text"
        : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Última compresión
        </span>
        <span className={cn("text-3xl font-bold tabular-nums", color)}>
          {cm.toFixed(1)}
          <span className="ml-1 text-sm font-medium text-muted-foreground">cm</span>
        </span>
      </div>
      <div className="relative mt-4 h-6 w-full overflow-hidden rounded-full bg-muted">
        {/* target range */}
        <div
          className="absolute inset-y-0 rounded-full bg-success/25 border-x-2 border-success/60"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        {/* current value */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-out",
            inRange ? "bg-success" : tooDeep ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${pct}%`, opacity: 0.85 }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>0 cm</span>
        <span>
          Objetivo {params.objetivoProfundidadMin}–{params.objetivoProfundidadMax} cm
        </span>
        <span>{max.toFixed(0)} cm</span>
      </div>
      <p className={cn("mt-3 text-center text-sm font-semibold", color)}>{label}</p>
    </div>
  );
}
