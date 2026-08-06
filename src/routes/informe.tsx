import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/pepe/AppShell";
import { Button } from "@/components/ui/button";
import { InformeView } from "@/components/pepe/InformeView";
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
  // Snapshot inmutable de la última práctica; si todavía no hay ninguna
  // (p. ej. sesión en curso), se cae al estado en vivo.
  const p = state.ultimaPractica;
  return (
    <AppShell title="Informe de sesión">
      <InformeView
        data={{
          sesionId: (p ? p.sesionId : state.sesionId) ?? undefined,
          fechaISO: (p ? p.sesionStartISO : state.sesionStartISO) ?? undefined,
          estudiante: p ? p.estudiante : state.estudiante,
          duracionPrueba: p ? p.duracionPrueba : state.duracionPrueba,
          totalCompresiones: p ? p.totalCompresiones : state.totalCompresiones,
          totalVentilacionesLocal: p
            ? p.totalVentilacionesLocal
            : state.totalVentilacionesLocal,
          cuentaPress30s: p ? p.cuentaPress30s : state.cuentaPress30s,
          estadisticasFinales: p ? p.estadisticasFinales : state.estadisticasFinales,
        }}
      />


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
