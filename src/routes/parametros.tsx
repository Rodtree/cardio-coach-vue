import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, RotateCcw, Bug, FileText } from "lucide-react";
import { AppShell } from "@/components/pepe/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InformeView, MOCK_INFORME } from "@/components/pepe/InformeView";
import { usePepe } from "@/lib/pepe-store";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";


export const Route = createFileRoute("/parametros")({
  head: () => ({
    meta: [
      { title: "PEPE — Parámetros de práctica" },
      { name: "description", content: "Configurá duración y umbrales objetivo antes de iniciar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParamsPage,
});

function ParamsPage() {
  const { params, setParams, isDocente, debugMode, setDebugMode } = usePepe();
  const navigate = useNavigate();
  const [form, setForm] = useState(params);

  useEffect(() => setForm(params), [params]);
  useEffect(() => {
    if (!isDocente) navigate({ to: "/" });
  }, [isDocente, navigate]);

  const save = () => {
    if (form.objetivoProfundidadMin >= form.objetivoProfundidadMax) {
      toast.error("El mínimo debe ser menor que el máximo");
      return;
    }
    setParams(form);
    toast.success("Parámetros guardados");
  };
  const reset = () => {
    const defaults = {
      duracionPrueba: 300,
      objetivoProfundidadMin: 5,
      objetivoProfundidadMax: 6,
      objetivoCompresionesPorMin: 110,
      wsUrl: "ws://192.168.10.1:81",
      instructor: "",
    };
    setForm(defaults);
    setParams(defaults);
    toast.info("Parámetros restablecidos");
  };


  return (
    <AppShell title="Parámetros de práctica">
      <Toaster richColors position="top-center" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Duración por defecto (segundos)"
          hint="Se aplica cuando iniciás una sesión nueva"
        >
          <NumericField
            value={form.duracionPrueba}
            onChange={(v) => setForm({ ...form, duracionPrueba: v })}
            min={30}
            max={1800}
          />
        </Field>
        <Field label="Compresiones objetivo por minuto" hint="Referencia guía RCP adulto ≈ 100–120">
          <NumericField
            value={form.objetivoCompresionesPorMin}
            onChange={(v) => setForm({ ...form, objetivoCompresionesPorMin: v })}
            min={60}
            max={160}
          />
        </Field>
        <Field label="Profundidad mínima (cm)" hint="Mínimo lógico 1 cm">
          <NumericField
            value={form.objetivoProfundidadMin}
            onChange={(v) => setForm({ ...form, objetivoProfundidadMin: v })}
            min={1}
            step="0.1"
          />
        </Field>
        <Field label="Profundidad máxima (cm)" hint="Mínimo lógico 1 cm">
          <NumericField
            value={form.objetivoProfundidadMax}
            onChange={(v) => setForm({ ...form, objetivoProfundidadMax: v })}
            min={1}
            step="0.1"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="URL del WebSocket del robot" hint="Por defecto ws://192.168.10.1:81">
            <Input
              value={form.wsUrl}
              onChange={(e) => setForm({ ...form, wsUrl: e.target.value })}
              placeholder="ws://192.168.10.1:81"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Instructor / Responsable" hint="Aparece en el informe y en el bloque de validación">
            <Input
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              placeholder="Nombre y apellido del docente responsable"
            />
          </Field>
        </div>

      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={save} size="lg">
          <Save className="mr-2 size-4" /> Guardar
        </Button>
        <Button onClick={reset} variant="outline" size="lg">
          <RotateCcw className="mr-2 size-4" /> Restablecer
        </Button>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Herramientas para docentes
        </h2>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground">
              <Bug className="size-4" />
            </span>
            <div>
              <p className="font-medium">Modo Debug</p>
              <p className="text-xs text-muted-foreground">
                Habilita simulación sin hardware y una consola flotante con
                eventos en vivo.
              </p>
            </div>
          </div>
          <Switch
            checked={debugMode}
            onCheckedChange={(v) => {
              setDebugMode(v);
              toast.info(v ? "Modo debug activado" : "Modo debug desactivado");
            }}
            aria-label="Activar modo debug"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground">
              <FileText className="size-4" />
            </span>
            <div>
              <p className="font-medium">Vista previa del informe</p>
              <p className="text-xs text-muted-foreground">
                Revisá diseño y contenido con datos de ejemplo, sin ejecutar
                una sesión real.
              </p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Ver ejemplo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vista previa — Informe de sesión</DialogTitle>
                <DialogDescription>
                  Datos de ejemplo. No corresponden a una práctica real.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <InformeView data={MOCK_INFORME} preview />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </AppShell>
  );
}


function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
