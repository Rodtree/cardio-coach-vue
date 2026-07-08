import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, ShieldCheck, HeartPulse, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePepe } from "@/lib/pepe-store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/pepe/ThemeToggle";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PEPE — Inicio" },
      {
        name: "description",
        content:
          "Elegí tu rol para acceder al panel del maniquí robótico PEPE de práctica RCP.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { isDocente, loginDocente, logoutDocente } = usePepe();
  const [showPw, setShowPw] = useState(false);
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
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <HeartPulse className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">PEPE</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maniquí robótico de práctica RCP
          </p>
          <p className="text-xs text-muted-foreground">
            Instituto Superior Politécnico Misiones N°1
          </p>
        </div>

        <div className="space-y-3">
          {!showPw ? (
            <>
              <button
                onClick={() => setShowPw(true)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Docente</span>
                  <span className="block text-xs text-muted-foreground">
                    Controlar sesión y ver métricas
                  </span>
                </span>
                <Lock className="size-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate({ to: "/estudiante" })}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <GraduationCap className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Estudiante</span>
                  <span className="block text-xs text-muted-foreground">
                    Ver mi práctica en vivo
                  </span>
                </span>
              </button>
              {isDocente && (
                <button
                  onClick={() => {
                    logoutDocente();
                    toast.info("Sesión docente cerrada");
                  }}
                  className="mt-2 w-full text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Cerrar sesión docente activa
                </button>
              )}
            </>
          ) : (
            <form
              onSubmit={submitDocente}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="font-semibold">Acceso Docente</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pw">Contraseña</Label>
                  <Input
                    id="pw"
                    type="password"
                    autoFocus
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
                      setShowPw(false);
                      setPw("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground">
          Conectate al WiFi del robot antes de iniciar la sesión.
        </p>
      </div>
    </div>
  );
}
