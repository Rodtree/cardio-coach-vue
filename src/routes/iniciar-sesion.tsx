import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePepe } from "@/lib/pepe-store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/pepe/ThemeToggle";

export const Route = createFileRoute("/iniciar-sesion")({
  head: () => ({
    meta: [
      { title: "PEPE — Acceso Docente" },
      {
        name: "description",
        content:
          "Ingresá la contraseña docente para acceder al panel de control del maniquí robótico PEPE.",
      },
      { property: "og:title", content: "PEPE — Acceso Docente" },
      {
        property: "og:description",
        content:
          "Ingresá la contraseña docente para acceder al panel de control del maniquí robótico PEPE.",
      },
    ],
  }),
  component: IniciarSesion,
});

function IniciarSesion() {
  const navigate = useNavigate();
  const { loginDocente } = usePepe();
  const [pw, setPw] = useState("");

  const submitDocente = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginDocente(pw)) {
      toast.success("Sesión docente iniciada");
      navigate({ to: "/docente" });
    } else {
      toast.error("Contraseña incorrecta");
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <form
          onSubmit={submitDocente}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="font-semibold">Acceso Docente</h1>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="pw">Contraseña</Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Ingresá la contraseña"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Ingresar</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPw("");
                  navigate({ to: "/" });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
