import { HeartPulse, Wind, Timer, Gauge, Droplet, User } from "lucide-react";
import { MetricCard } from "@/components/pepe/Metrics";
import type { EstadisticasVentilacion } from "@/lib/pepe-store";

export interface InformeData {
  estudiante: string;
  duracionPrueba: number;
  totalCompresiones: number;
  totalVentilacionesLocal: number;
  cuentaPress30s: number;
  estadisticasFinales: EstadisticasVentilacion | null;
}

export const MOCK_INFORME: InformeData = {
  estudiante: "María García (ejemplo)",
  duracionPrueba: 300,
  totalCompresiones: 548,
  totalVentilacionesLocal: 36,
  cuentaPress30s: 54,
  estadisticasFinales: {
    totalVentilaciones: 36,
    tiempoPromedioEntreVentilaciones: 8.3,
    duracionPromedioVentilaciones: 1120,
    airePromedioVentilado: 540,
  },
};

export function InformeView({ data }: { data: InformeData }) {
  const stats = data.estadisticasFinales;
  return (
    <>
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
                {data.estudiante || "Sin nombre registrado"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Duración configurada
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {data.duracionPrueba} s
            </p>
          </div>
        </div>
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Compresiones totales"
          value={data.totalCompresiones}
          icon={HeartPulse}
          tone="primary"
        />
        <MetricCard
          label="Ventilaciones totales"
          value={stats?.totalVentilaciones ?? data.totalVentilacionesLocal}
          icon={Wind}
        />
        <MetricCard
          label="Compresiones últimos 30 s"
          value={data.cuentaPress30s}
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
    </>
  );
}
