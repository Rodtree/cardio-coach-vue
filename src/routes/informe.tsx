import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse, Wind, Timer, Gauge, Droplet, User } from "lucide-react";
import { AppShell } from "@/components/pepe/AppShell";
import { MetricCard } from "@/components/pepe/Metrics";
import { Button } from "@/components/ui/button";
import { usePepe } from "@/lib/pepe-store";

export const Route = createFileRoute("/informe")({
  head: () => ({
    meta: [
      { title: "PEPE — Informe de sesión" },
      { name: "description", content: "Resumen post-sesión con estadísticas finales." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InformePage,
});

function InformePage() {
  const { state } = usePepe();
  const stats = state.estadisticasFinales;

  return (
    <AppShell title="Informe de sesión">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <User className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Alumno
              </p>
              <p className="text-lg font-semibold">
                {state.estudiante || "Sin nombre registrado"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Duración configurada
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {state.duracionPrueba} s
            </p>
          </div>
        </div>
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Compresiones totales"
          value={state.totalCompresiones}
          icon={HeartPulse}
          tone="primary"
        />
        <MetricCard
          label="Ventilaciones totales"
          value={stats?.totalVentilaciones ?? state.totalVentilacionesLocal}
          icon={Wind}
        />
        <MetricCard
          label="Compresiones últimos 30 s"
          value={state.cuentaPress30s}
          icon={Timer}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Estadísticas de ventilación
        </h2>
        {stats ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Tiempo promedio entre ventilaciones"
              value={stats.tiempoPromedioEntreVentilaciones.toFixed(2)}
              unit="s"
              icon={Timer}
            />
            <MetricCard
              label="Duración promedio de ventilación"
              value={stats.duracionPromedioVentilaciones.toFixed(0)}
              unit="ms"
              icon={Gauge}
            />
            <MetricCard
              label="Aire promedio ventilado"
              value={stats.airePromedioVentilado.toFixed(0)}
              unit="cm³"
              icon={Droplet}
              tone="success"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay estadísticas finales. Se generan cuando el robot cierra la sesión.
            </p>
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/docente">Volver al panel docente</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Inicio</Link>
        </Button>
      </div>
    </AppShell>
  );
}
