import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePepe, type EstadisticasVentilacion } from "@/lib/pepe-store";
import { capturePdfBlob, downloadBlob, safeFilenamePart } from "@/lib/pdf-export";


export interface InformeData {
  sesionId?: string;
  fechaISO?: string;
  estudiante: string;
  duracionPrueba: number;
  totalCompresiones: number;
  totalVentilacionesLocal: number;
  cuentaPress30s: number;
  estadisticasFinales: EstadisticasVentilacion | null;
}

export const MOCK_INFORME: InformeData = {
  sesionId: "mock-session-2026-01-01",
  fechaISO: "2026-01-01T10:30:00Z",
  estudiante: "María García (ejemplo)",
  duracionPrueba: 300,
  totalCompresiones: 548,
  totalVentilacionesLocal: 36,
  cuentaPress30s: 54,
  estadisticasFinales: {
    totalVentilaciones: 36,
    tiempoPromedioEntreVentilaciones: 8.3,
    duracionPromedioVentilaciones: 1120,
    airePromedioVentilado: 540,
  },
};

const AZUL = "#283F9F";
const ROJO = "#E63235";

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function verificationCode(data: InformeData) {
  const seed = `${data.sesionId ?? ""}|${data.fechaISO ?? ""}|${data.estudiante}|${data.totalCompresiones}`;
  const h = hashCode(seed).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `PEPE-${h}`;
}

export function informeFilename(data: InformeData) {
  return `Informe_${safeFilenamePart(data.estudiante)}_${verificationCode(data)}.pdf`;
}


function formatFechaLarga(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function formatFechaHora(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface InformeViewHandle {
  getPdfBlob: () => Promise<Blob>;
  getElement: () => HTMLDivElement | null;
}

export interface InformeViewProps {
  data: InformeData;
  preview?: boolean;
  /** Override del instructor (para render offscreen sin PepeProvider) */
  instructorOverride?: string;
  /** Oculta el header con el botón de descarga */
  hideChrome?: boolean;
}

export const InformeView = forwardRef<InformeViewHandle, InformeViewProps>(
  function InformeView(
    { data, preview = false, instructorOverride, hideChrome = false },
    ref,
  ) {
    const pepe = usePepe();
    const stats = data.estadisticasFinales;
    const codigo = useMemo(() => verificationCode(data), [data]);
    // Las fechas se formatean con la zona horaria/locale del navegador y, si no
    // hay fechaISO, dependen de `new Date()` — ambos difieren del render en el
    // servidor. Se calculan sólo después del montaje para evitar el mismatch
    // de hidratación (React #418).
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const fechaLarga = hydrated ? formatFechaLarga(data.fechaISO) : "—";
    const fechaHora = hydrated ? formatFechaHora(data.fechaISO) : "—";
    const instructorRaw =
      instructorOverride?.trim() || pepe.params.instructor?.trim() || "";
    const instructor = instructorRaw || "Sin asignar";
    const alumnoRaw = data.estudiante?.trim() || "";
    const alumno = alumnoRaw || "Sin asignar";
    const incompleto = !alumnoRaw || !instructorRaw;
    const sinCompresiones = data.totalCompresiones <= 0;
    const ventilaciones = stats?.totalVentilaciones ?? data.totalVentilacionesLocal;
    const docRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        getPdfBlob: async () => {
          if (!docRef.current) throw new Error("Informe no montado");
          return await capturePdfBlob(docRef.current);
        },
        getElement: () => docRef.current,
      }),
      [],
    );

    const download = async () => {
      if (!docRef.current || incompleto) return;
      setDownloading(true);
      try {
        const blob = await capturePdfBlob(docRef.current);
        downloadBlob(blob, informeFilename(data));
      } finally {
        setDownloading(false);
      }
    };

    return (
      <div>
        {!hideChrome && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {incompleto
                ? "Completá alumno/a e instructor para habilitar la descarga"
                : "Documento de práctica · ISPM N°1"}
            </p>
            <Button
              onClick={download}
              disabled={downloading || incompleto}
              size="sm"
              title={
                incompleto
                  ? "Faltan datos de alumno/a o instructor"
                  : undefined
              }
            >
              {downloading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Descargar informe (PDF)
            </Button>
          </div>
        )}

        <div
          ref={docRef}
          className="relative mx-auto overflow-hidden rounded-md bg-white text-neutral-900 shadow-sm"
          style={{ width: "100%", maxWidth: 820 }}
        >
          {(preview || incompleto) && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <span
                style={{
                  transform: "rotate(-24deg)",
                  fontSize: 96,
                  fontWeight: 800,
                  letterSpacing: 8,
                  color: preview ? AZUL : ROJO,
                  opacity: 0.08,
                  whiteSpace: "nowrap",
                }}
              >
                {preview ? "VISTA PREVIA" : "BORRADOR"}
              </span>
            </div>
          )}

          <div className="relative z-20 p-8 sm:p-10">
            {/* Encabezado simple */}
            <header className="border-b border-neutral-200 pb-4">
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                Instituto Superior Politécnico Misiones N°1
              </p>
              <h1 className="mt-1 text-xl font-semibold text-neutral-900">
                Informe de Práctica de RCP
              </h1>
              <p className="text-xs text-neutral-500">
                Sistema PEPE — Maniquí robótico de práctica de RCP
              </p>
            </header>

            {/* Título del documento */}
            <div className="py-5 text-center">
              <h2 className="text-2xl font-bold text-neutral-900">
                Resumen de la sesión
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Registro interno de práctica de Reanimación Cardiopulmonar
              </p>
            </div>

            {/* Datos del alumno */}
            <section className="mb-6">
              <SectionTitle>Datos de la práctica</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Row k="Alumno / Alumna" v={alumno} />
                <Row k="Fecha de la sesión" v={fechaLarga} />
                <Row
                  k="Duración configurada"
                  v={`${data.duracionPrueba} segundos`}
                />
                <Row k="Instructor responsable" v={instructor} />
              </dl>
            </section>

            {/* Resultados */}
            <section className="mb-6">
              <SectionTitle>Resultados registrados</SectionTitle>
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow
                    label="Compresiones totales"
                    value={sinCompresiones ? "Sin datos" : String(data.totalCompresiones)}
                  />
                  <ResultRow
                    label="Ventilaciones totales"
                    value={
                      !stats && ventilaciones <= 0
                        ? "Sin datos"
                        : String(ventilaciones)
                    }
                  />
                  <ResultRow
                    label="Compresiones en los últimos 30 s"
                    value={sinCompresiones ? "Sin datos" : String(data.cuentaPress30s)}
                  />

                  {stats && (
                    <>
                      <ResultRow
                        label="Tiempo promedio entre ventilaciones"
                        value={`${stats.tiempoPromedioEntreVentilaciones.toFixed(2)} s`}
                      />
                      <ResultRow
                        label="Duración promedio de ventilación"
                        value={`${stats.duracionPromedioVentilaciones.toFixed(0)} ms`}
                      />
                      <ResultRow
                        label="Aire promedio ventilado"
                        value={`${stats.airePromedioVentilado.toFixed(0)} cm³`}
                      />
                    </>
                  )}
                </tbody>
              </table>
              {!stats && (
                <p className="mt-2 text-xs italic text-neutral-500">
                  Aún no se recibieron las estadísticas finales de ventilación
                  desde el maniquí.
                </p>
              )}
            </section>

            {/* Validación */}
            <section
              className="mt-8 rounded-md border border-neutral-200 bg-neutral-50 p-5"
            >
              <SectionTitle>Validación de la práctica</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                <ValField label="Código de verificación">
                  <span
                    className="font-mono text-lg font-bold tracking-wider"
                    style={{ color: AZUL }}
                  >
                    {codigo}
                  </span>
                </ValField>
                <ValField label="Fecha y hora">
                  <span className="text-sm">{fechaHora}</span>
                </ValField>
                <ValField label="Instructor / Responsable">
                  <span className="text-sm">{instructor}</span>
                </ValField>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                Este código certifica que{" "}
                <strong>{data.estudiante || "el/la alumno/a"}</strong> realizó y
                completó la práctica de Reanimación Cardiopulmonar (RCP)
                registrada por el sistema PEPE, en el marco de la Tecnicatura
                Superior en Automatización y Robótica del Instituto Superior
                Politécnico Misiones N°1, el {fechaLarga}. Este documento
                constituye un registro interno de la práctica realizada y no
                reemplaza certificaciones oficiales de primeros auxilios o RCP.
              </p>
            </section>

            <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
              <span>
                Documento generado por el sistema PEPE · ISPM N°1
              </span>
              <span className="font-mono">{codigo}</span>
            </footer>
          </div>
        </div>
      </div>
    );
  },
);


function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-3 border-b border-neutral-200 pb-1 text-sm font-semibold uppercase tracking-wider text-neutral-700"
    >
      {children}
    </h3>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col border-b border-neutral-200 py-1.5">
      <dt className="text-[10.5px] uppercase tracking-wider text-neutral-500">
        {k}
      </dt>
      <dd className="text-sm font-semibold text-neutral-900">{v}</dd>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-neutral-200">
      <td className="py-1.5 pr-4 text-neutral-700">{label}</td>
      <td className="py-1.5 text-right font-semibold tabular-nums text-neutral-900">
        {value}
      </td>
    </tr>
  );
}

function ValField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
