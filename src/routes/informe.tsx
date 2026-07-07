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
  return (
    <AppShell title="Informe de sesión">
      <InformeView
        data={{
          estudiante: state.estudiante,
          duracionPrueba: state.duracionPrueba,
          totalCompresiones: state.totalCompresiones,
          totalVentilacionesLocal: state.totalVentilacionesLocal,
          cuentaPress30s: state.cuentaPress30s,
          estadisticasFinales: state.estadisticasFinales,
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
