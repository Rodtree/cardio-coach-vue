import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePepe } from "@/lib/pepe-store";
import {
  InformeView,
  informeFilename,
  verificationCode,
  type InformeData,
  type InformeViewHandle,
} from "@/components/pepe/InformeView";
import {
  getSavedDirHandle,
  isFsAccessSupported,
  savePracticaToFolder,
  verifyPermission,
  type HistorialEntry,
} from "@/lib/pepe-history";

/**
 * Escucha el fin de la sesión (transición de estadisticasFinales null → set)
 * y, si hay una carpeta de historial configurada, guarda automáticamente el
 * PDF del informe + actualiza indice.json.
 *
 * Se monta una vez en __root para no acoplarse a ninguna pantalla.
 */
export function AutoSaveInforme() {
  const { state } = usePepe();
  const prevStatsRef = useRef(state.estadisticasFinales);
  const [pending, setPending] = useState<InformeData | null>(null);
  const viewRef = useRef<InformeViewHandle>(null);

  // Detectar cierre de sesión
  useEffect(() => {
    const prev = prevStatsRef.current;
    prevStatsRef.current = state.estadisticasFinales;
    if (!prev && state.estadisticasFinales && isFsAccessSupported()) {
      const snapshot: InformeData = {
        sesionId: state.sesionId ?? undefined,
        fechaISO: state.sesionStartISO ?? new Date().toISOString(),
        estudiante: state.estudiante || "Sin nombre",
        duracionPrueba: state.duracionPrueba,
        totalCompresiones: state.totalCompresiones,
        totalVentilacionesLocal: state.totalVentilacionesLocal,
        cuentaPress30s: state.cuentaPress30s,
        estadisticasFinales: state.estadisticasFinales,
      };
      setPending(snapshot);
    }
  }, [
    state.estadisticasFinales,
    state.sesionId,
    state.sesionStartISO,
    state.estudiante,
    state.duracionPrueba,
    state.totalCompresiones,
    state.totalVentilacionesLocal,
    state.cuentaPress30s,
  ]);

  // Cuando pending está listo, esperar al render y capturar
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const run = async () => {
      const dir = await getSavedDirHandle();
      if (!dir) {
        setPending(null);
        return; // no hay carpeta configurada — no guardar automático
      }
      // Esperar frame para que el offscreen render tenga layout
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;
      try {
        const perm = await verifyPermission(dir, true);
        if (perm !== "granted") {
          toast.warning(
            "Permiso denegado para escribir en la carpeta del historial",
          );
          setPending(null);
          return;
        }
        if (!viewRef.current) throw new Error("Informe no montado");
        const blob = await viewRef.current.getPdfBlob();
        const codigo = verificationCode(pending);
        const archivo = informeFilename(pending);
        const entry: HistorialEntry = {
          codigo,
          estudiante: pending.estudiante,
          fechaISO: pending.fechaISO ?? new Date().toISOString(),
          duracionPrueba: pending.duracionPrueba,
          totalCompresiones: pending.totalCompresiones,
          totalVentilaciones:
            pending.estadisticasFinales?.totalVentilaciones ??
            pending.totalVentilacionesLocal,
          cuentaPress30s: pending.cuentaPress30s,
          archivo,
        };
        await savePracticaToFolder(dir, entry, blob);
        toast.success(`Informe guardado en la carpeta (${codigo})`);
      } catch (e) {
        toast.error(`No se pudo guardar el informe: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setPending(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  if (!pending) return null;

  // Offscreen render — invisible pero con layout real para html2canvas
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: "-100000px",
        top: 0,
        width: 820,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      <InformeView ref={viewRef} data={pending} hideChrome />
    </div>
  );
}
