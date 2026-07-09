import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  FolderOpen,
  History,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/pepe/AppShell";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  clearDirHandle,
  getSavedDirHandle,
  isFsAccessSupported,
  listHistorial,
  openHistorialPdf,
  pickDirHandle,
  removeHistorialEntry,
  verifyPermission,
  type HistorialEntry,
} from "@/lib/pepe-history";
import { downloadBlob } from "@/lib/pdf-export";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "PEPE — Historial de prácticas" },
      {
        name: "description",
        content:
          "Listado de prácticas de RCP registradas por el sistema PEPE, con acceso al PDF de cada informe.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistorialPage,
});

function HistorialPage() {
  const supported = isFsAccessSupported();
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [permission, setPermission] = useState<PermissionState | "unknown">(
    "unknown",
  );
  const [entries, setEntries] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (h: FileSystemDirectoryHandle) => {
    setLoading(true);
    try {
      const list = await listHistorial(h);
      setEntries(list);
    } catch (e) {
      toast.error(`No se pudo leer el historial: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      const h = await getSavedDirHandle();
      if (!h) return;
      setDir(h);
      try {
        // @ts-expect-error non-standard
        const q: PermissionState = await h.queryPermission({ mode: "readwrite" });
        setPermission(q);
        if (q === "granted") await load(h);
      } catch {
        setPermission("prompt");
      }
    })();
  }, [load, supported]);

  const pickFolder = async () => {
    try {
      const h = await pickDirHandle();
      setDir(h);
      setPermission("granted");
      await load(h);
      toast.success("Carpeta configurada");
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError")
        toast.error(`No se pudo elegir la carpeta: ${err.message}`);
    }
  };

  const grantPermission = async () => {
    if (!dir) return;
    try {
      const p = await verifyPermission(dir, true);
      setPermission(p);
      if (p === "granted") {
        await load(dir);
        toast.success("Permiso concedido");
      } else {
        toast.error("Permiso denegado");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const clearFolder = async () => {
    await clearDirHandle();
    setDir(null);
    setEntries([]);
    setPermission("unknown");
    toast.info("Carpeta desvinculada (los archivos no se borran)");
  };

  const openEntry = async (entry: HistorialEntry) => {
    if (!dir) return;
    const blob = await openHistorialPdf(dir, entry.archivo);
    if (!blob) {
      toast.error("El archivo PDF ya no existe en la carpeta");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadEntry = async (entry: HistorialEntry) => {
    if (!dir) return;
    const blob = await openHistorialPdf(dir, entry.archivo);
    if (!blob) {
      toast.error("El archivo PDF ya no existe en la carpeta");
      return;
    }
    downloadBlob(blob, entry.archivo);
  };

  const removeEntry = async (entry: HistorialEntry) => {
    if (!dir) return;
    if (!confirm(`¿Eliminar el informe de ${entry.estudiante}?`)) return;
    await removeHistorialEntry(dir, entry.codigo);
    await load(dir);
    toast.success("Informe eliminado");
  };

  return (
    <AppShell title="Historial de prácticas">
      <Toaster richColors position="top-center" />

      {!supported && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" />
            Navegador no compatible
          </div>
          <p className="text-muted-foreground">
            El historial automático requiere la <strong>File System Access API</strong>,
            disponible sólo en Google Chrome o Microsoft Edge de escritorio. Podés
            seguir descargando el PDF manualmente desde la pantalla del informe.
          </p>
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/informe">Ir al informe actual</Link>
            </Button>
          </div>
        </div>
      )}

      {supported && !dir && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Configurá la carpeta del historial</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Elegí una carpeta local (por ejemplo <code>C:\PEPE\Informes</code>).
            Los PDFs de cada práctica se guardarán ahí automáticamente y se
            listarán en esta pantalla. La app recuerda la carpeta entre sesiones.
          </p>
          <Button onClick={pickFolder} size="lg">
            <FolderOpen className="mr-2 size-4" />
            Elegir carpeta de informes
          </Button>
        </div>
      )}

      {supported && dir && permission !== "granted" && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" />
            Permiso requerido
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            El navegador necesita que vuelvas a otorgar permiso para leer/escribir
            en la carpeta seleccionada.
          </p>
          <Button onClick={grantPermission} size="sm">
            <RefreshCw className="mr-2 size-4" />
            Volver a otorgar permiso
          </Button>
        </div>
      )}

      {supported && dir && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="size-4 text-primary" />
              <span className="truncate">
                Carpeta: <strong>{dir.name}</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => dir && load(dir)}
                variant="outline"
                size="sm"
                disabled={loading || permission !== "granted"}
              >
                <RefreshCw className="mr-2 size-4" />
                Actualizar
              </Button>
              <Button onClick={pickFolder} variant="outline" size="sm">
                Cambiar
              </Button>
              <Button onClick={clearFolder} variant="ghost" size="sm">
                Desvincular
              </Button>
            </div>
          </div>

          {permission === "granted" && entries.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no hay prácticas guardadas. Los informes se agregarán
                automáticamente cuando el maniquí cierre una sesión.
              </p>
            </div>
          )}

          {permission === "granted" && entries.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Alumno</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2 text-right">Compresiones</th>
                    <th className="px-3 py-2 text-right">Ventilaciones</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.codigo} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{e.estudiante}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(e.fechaISO).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{e.codigo}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.totalCompresiones}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.totalVentilaciones}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEntry(e)}
                            aria-label="Ver informe"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadEntry(e)}
                            aria-label="Descargar PDF"
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeEntry(e)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
