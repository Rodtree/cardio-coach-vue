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
          <Input
            type="number"
            min={30}
            max={1800}
            value={form.duracionPrueba}
            onChange={(e) =>
              setForm({ ...form, duracionPrueba: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Compresiones objetivo por minuto" hint="Referencia guía RCP adulto ≈ 100–120">
          <Input
            type="number"
            min={60}
            max={160}
            value={form.objetivoCompresionesPorMin}
            onChange={(e) =>
              setForm({
                ...form,
                objetivoCompresionesPorMin: Number(e.target.value) || 0,
              })
            }
          />
        </Field>
        <Field label="Profundidad mínima (cm)">
          <Input
            type="number"
            step="0.1"
            value={form.objetivoProfundidadMin}
            onChange={(e) =>
              setForm({
                ...form,
                objetivoProfundidadMin: Number(e.target.value) || 0,
              })
            }
          />
        </Field>
        <Field label="Profundidad máxima (cm)">
          <Input
            type="number"
            step="0.1"
            value={form.objetivoProfundidadMax}
            onChange={(e) =>
              setForm({
                ...form,
                objetivoProfundidadMax: Number(e.target.value) || 0,
              })
            }
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
      </div>

      <div className="mt-6 flex gap-2">
        <Button onClick={save} size="lg">
          <Save className="mr-2 size-4" /> Guardar
        </Button>
        <Button onClick={reset} variant="outline" size="lg">
          <RotateCcw className="mr-2 size-4" /> Restablecer
        </Button>
      </div>
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
