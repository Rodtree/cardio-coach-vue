import { useEffect, useRef } from "react";
import { Bug, Play, Square, Trash2, Wifi } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { usePepe } from "@/lib/pepe-store";
import { cn } from "@/lib/utils";

export function DebugPanel() {
  const {
    debugMode,
    logs,
    clearLogs,
    simulating,
    startSimulation,
    stopSimulation,
    state,
    params,
  } = usePepe();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (!debugMode) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
          variant={simulating ? "destructive" : "default"}
          aria-label="Abrir panel de debug"
        >
          <Bug className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Bug className="size-4" /> Modo Debug
            {simulating && (
              <Badge variant="destructive" className="ml-2">Simulando</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Simulá una sesión completa sin hardware conectado y revisá los datos
            en tiempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {!simulating ? (
              <Button
                onClick={() => startSimulation("Alumno de prueba", 60)}
                className="flex-1"
                size="sm"
              >
                <Play className="mr-2 size-4" /> Simular sesión (60s)
              </Button>
            ) : (
              <Button
                onClick={stopSimulation}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <Square className="mr-2 size-4" /> Detener simulación
              </Button>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
            <p className="flex items-center gap-1.5 font-medium">
              <Wifi className="size-3.5" /> Datos en tiempo real
            </p>
            <DataRow k="Estado" v={state.status} />
            <DataRow k="Alumno" v={state.estudiante || "—"} />
            <DataRow k="Última compresión" v={state.ultimaCompresion?.toFixed(2) ?? "—"} u="cm" />
            <DataRow k="Compresiones" v={state.totalCompresiones} />
            <DataRow k="Últimos 30 s" v={state.cuentaPress30s} />
            <DataRow k="Ventilaciones" v={state.totalVentilacionesLocal} />
            <DataRow
              k="Última vent."
              v={
                state.ultimaVentilacion
                  ? `${state.ultimaVentilacion.cm3ventilados} cm³ · ${state.ultimaVentilacion.duracionVentilacion} ms`
                  : "—"
              }
            />
            <DataRow k="Batería" v={state.bateria ?? "—"} u={state.bateria !== null ? "%" : ""} />
            <DataRow k="WS URL" v={params.wsUrl} />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Consola ({logs.length})
          </p>
          <Button size="sm" variant="ghost" onClick={clearLogs} className="h-7">
            <Trash2 className="mr-1 size-3.5" /> Limpiar
          </Button>
        </div>
        <ScrollArea className="flex-1 border-t border-border">
          <div
            ref={scrollRef as never}
            className="p-3 font-mono text-[11px] leading-relaxed space-y-0.5"
          >
            {logs.length === 0 && (
              <p className="text-muted-foreground italic">Sin eventos aún…</p>
            )}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">
                  {new Date(l.ts).toLocaleTimeString("es-AR", { hour12: false })}
                </span>
                <span
                  className={cn(
                    "shrink-0 uppercase w-10",
                    l.level === "error" && "text-destructive",
                    l.level === "warn" && "text-warning-foreground",
                    l.level === "event" && "text-primary",
                    l.level === "info" && "text-muted-foreground",
                  )}
                >
                  {l.level}
                </span>
                <span className="break-all">{l.msg}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DataRow({ k, v, u }: { k: string; v: React.ReactNode; u?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums truncate">
        {v}
        {u ? ` ${u}` : ""}
      </span>
    </div>
  );
}
