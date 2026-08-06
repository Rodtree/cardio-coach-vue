import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryCharging,
  WifiOff,
  Wifi,
  Loader2,
} from "lucide-react";
import { usePepe } from "@/lib/pepe-store";
import { ThemeToggle } from "@/components/pepe/ThemeToggle";
import { DebugPanel } from "@/components/pepe/DebugPanel";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";



function StatusPill() {
  const { state } = usePepe();
  const map = {
    connected: { label: "Conectado", icon: Wifi, cls: "bg-success/15 text-success-text border-success/30" },
    connecting: { label: "Conectando…", icon: Loader2, cls: "bg-warning/15 text-warning-text border-warning/30" },
    disconnected: { label: "Desconectado", icon: WifiOff, cls: "bg-muted text-muted-foreground border-border" },
    error: { label: "Error de conexión", icon: WifiOff, cls: "bg-destructive/15 text-destructive-text border-destructive/30" },
  } as const;
  const m = map[state.status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        m.cls,
      )}
    >
      <Icon className={cn("size-3.5", state.status === "connecting" && "animate-spin")} />
      {m.label}
    </span>
  );
}

function BatteryPill() {
  const { state } = usePepe();
  if (state.bateria === null) return null;
  const b = state.bateria;
  const cargando = state.tendencia === "cargando";
  const Icon = cargando
    ? BatteryCharging
    : b > 66
      ? BatteryFull
      : b > 30
        ? BatteryMedium
        : BatteryLow;
  const cls = cargando
    ? "text-primary"
    : b > 30
      ? "text-success"
      : b > 15
        ? "text-warning-text"
        : "text-destructive-text";
  const mostrarRestante =
    state.tendencia === "descargando" && state.minutosRestantesEstimados > 0;
  const titulo =
    state.tendencia === "cargando"
      ? "Batería cargando"
      : state.tendencia === "descargando"
        ? "Batería descargando"
        : "Batería estable";
  return (
    <span
      title={titulo}
      className={cn("inline-flex items-center gap-1 text-xs font-medium", cls)}
    >
      <Icon className={cn("size-4", state.tendencia === "estable" && "opacity-80")} />
      <span className="hidden sm:inline text-muted-foreground">Batería</span>
      {Math.round(b)}%
      {mostrarRestante && (
        <span className="text-muted-foreground">
          ~{Math.round(state.minutosRestantesEstimados)} min
        </span>
      )}
    </span>
  );
}

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/docente", label: "Docente" },
  { to: "/estudiante", label: "Estudiante" },
  { to: "/parametros", label: "Parámetros" },
  { to: "/informe", label: "Informe" },
  { to: "/historial", label: "Historial" },
] as const;


export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Activity className="size-5" />
            </span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-semibold tracking-tight truncate">PEPE</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Práctica RCP · ISPM N°1
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <BatteryPill />
            <StatusPill />
            <ThemeToggle />
          </div>

        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {NAV.map((n) => {
            const active =
              n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {title && (
          <h1 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h1>
        )}
        {children}
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        PEPE · Maniquí robótico ESP32 · Tecnicatura en Automatización y Robótica
      </footer>
      <DebugPanel />
    </div>

  );
}
