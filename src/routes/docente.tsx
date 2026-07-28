import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Square, RotateCcw, Wind, HeartPulse, Timer, User } from "lucide-react";
import { AppShell } from "@/components/pepe/AppShell";
import { LiveChart } from "@/components/pepe/LiveChart";
import { MetricCard } from "@/components/pepe/Metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePepe, useAutoConnect } from "@/lib/pepe-store";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/docente")({
  head: () => ({
    meta: [
      { title: "PEPE — Panel Docente" },
      { name: "description", content: "Controles y monitoreo en vivo del maniquí PEPE." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocentePage,
});

function DocentePage() {
  const navigate = useNavigate();
  const { state, params, isDocente, simulating, sendStart, sendStop, sendReset } = usePepe();
  useAutoConnect();

  const [alumno, setAlumno] = useState("");
  const [duracion, setDuracion] = useState(params.duracionPrueba);

  useEffect(() => {
    if (!isDocente) navigate({ to: "/" });
  }, [isDocente, navigate]);

  useEffect(() => {
    setDuracion(params.duracionPrueba);
  }, [params.duracionPrueba]);

  const iniciar = () => {
    if (!alumno.trim()) {
      toast.error("Ingresá el nombre del alumno");
      return;
    }
    // TEMPORAL (diagnóstico bug 2ª práctica)
    console.log("[PEPE] antes de sendStart:", state.status, state.sesionActiva);
    if (!simulating && state.status !== "connected") {
      toast.error("Sin conexión al robot");
      return;
    }
    const ok = sendStart(alumno.trim(), duracion);
    if (!ok) {
      toast.error("No se pudo iniciar: reconectando con el robot, probá de nuevo");
      return;
    }
    toast.success(`Sesión iniciada — ${alumno.trim()}`);
  };
  const detener = () => {
    sendStop();
    toast.info("Sesión detenida");
    setTimeout(() => navigate({ to: "/informe" }), 400);
  };
  const reiniciar = () => {
    sendReset();
    toast.info("Práctica reiniciada");
  };

  return (
    <AppShell title="Panel Docente">
      <Toaster richColors position="top-center" />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Configuración de la práctica
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <Label htmlFor="alumno">Nombre del alumno</Label>
            <Input
              id="alumno"
              value={alumno}
              onChange={(e) => setAlumno(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="mt-1"
              disabled={state.sesionActiva}
            />
          </div>
          <div>
            <Label htmlFor="dur">Duración (s)</Label>
            <Input
              id="dur"
              type="number"
              min={30}
              max={1800}
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value) || 0)}
              className="mt-1"
              disabled={state.sesionActiva}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button
            onClick={iniciar}
            disabled={state.sesionActiva}
            className="w-full"
            size="lg"
          >
            <Play className="mr-2 size-4" /> Iniciar
          </Button>
          <Button
            onClick={detener}
            disabled={!state.sesionActiva}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <Square className="mr-2 size-4" /> Detener
          </Button>
          <Button
            onClick={reiniciar}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <RotateCcw className="mr-2 size-4" /> Reiniciar
          </Button>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Compresiones"
          value={state.totalCompresiones}
          icon={HeartPulse}
          tone="primary"
        />
        <MetricCard
          label="Últimos 30 s"
          value={state.cuentaPress30s}
          unit="compresiones"
          icon={Timer}
        />
        <MetricCard
          label="Ventilaciones"
          value={state.totalVentilacionesLocal}
          icon={Wind}
          hint={
            state.ultimaVentilacion
              ? `Última: ${state.ultimaVentilacion.cm3ventilados} cm³ · ${state.ultimaVentilacion.duracionVentilacion} ms`
              : "Sin datos aún"
          }
        />
        <MetricCard
          label="Alumno"
          value={state.estudiante || alumno || "—"}
          icon={User}
        />
      </section>

      <section className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profundidad de compresión en vivo
          </h2>
          <span className="text-xs text-muted-foreground">
            Objetivo {params.objetivoProfundidadMin}–{params.objetivoProfundidadMax} cm
          </span>
        </div>
        <LiveChart height={280} />
      </section>
    </AppShell>
  );
}
