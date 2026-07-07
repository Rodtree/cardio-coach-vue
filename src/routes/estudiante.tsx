import { createFileRoute } from "@tanstack/react-router";
import { HeartPulse, Wind, Timer } from "lucide-react";
import { AppShell } from "@/components/pepe/AppShell";
import { DepthGauge } from "@/components/pepe/DepthGauge";
import { LiveChart } from "@/components/pepe/LiveChart";
import { MetricCard } from "@/components/pepe/Metrics";
import { usePepe, useAutoConnect } from "@/lib/pepe-store";

export const Route = createFileRoute("/estudiante")({
  head: () => ({
    meta: [
      { title: "PEPE — Panel Estudiante" },
      { name: "description", content: "Vista en vivo de tu práctica de RCP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EstudiantePage,
});

function EstudiantePage() {
  const { state } = usePepe();
  useAutoConnect();

  return (
    <AppShell title="Panel Estudiante">
      {state.estudiante && (
        <p className="mb-3 text-sm text-muted-foreground">
          Practicando: <span className="font-medium text-foreground">{state.estudiante}</span>
        </p>
      )}

      <DepthGauge />

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Compresiones"
          value={state.totalCompresiones}
          icon={HeartPulse}
          tone="primary"
        />
        <MetricCard
          label="Últimos 30 s"
          value={state.cuentaPress30s}
          icon={Timer}
        />
        <MetricCard
          label="Ventilaciones"
          value={state.totalVentilacionesLocal}
          icon={Wind}
        />
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tu curva de compresión
        </h2>
        <LiveChart height={220} />
      </section>

      {!state.sesionActiva && state.totalCompresiones === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Esperando que el docente inicie la práctica…
        </p>
      )}
    </AppShell>
  );
}
