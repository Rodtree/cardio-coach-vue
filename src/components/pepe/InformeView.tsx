import { useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePepe, type EstadisticasVentilacion } from "@/lib/pepe-store";
import ispmLogoAsset from "@/assets/ispm-logo.png.asset.json";

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

// Colores institucionales ISPM Nro. 1
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

function verificationCode(data: InformeData) {
  const seed = `${data.sesionId ?? ""}|${data.fechaISO ?? ""}|${data.estudiante}|${data.totalCompresiones}`;
  const h = hashCode(seed).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `PEPE-${h}`;
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

export function InformeView({
  data,
  preview = false,
}: {
  data: InformeData;
  preview?: boolean;
}) {
  const { params } = usePepe();
  const stats = data.estadisticasFinales;
  const codigo = useMemo(() => verificationCode(data), [data]);
  const fechaLarga = formatFechaLarga(data.fechaISO);
  const fechaHora = formatFechaHora(data.fechaISO);
  const instructor = params.instructor?.trim() || "—";
  const docRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const w = pageW - margin * 2;
      const h = (canvas.height * w) / canvas.width;
      if (h <= pageH - margin * 2) {
        pdf.addImage(img, "PNG", margin, margin, w, h);
      } else {
        // Multi-página
        const pageContentH = pageH - margin * 2;
        const sliceHpx = (canvas.width * pageContentH) / w;
        let y = 0;
        while (y < canvas.height) {
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = Math.min(sliceHpx, canvas.height - y);
          const ctx = slice.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, -y);
          const sImg = slice.toDataURL("image/png");
          const sH = (slice.height * w) / slice.width;
          pdf.addImage(sImg, "PNG", margin, margin, w, sH);
          y += slice.height;
          if (y < canvas.height) pdf.addPage();
        }
      }
      const safeName = (data.estudiante || "sin-nombre")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      pdf.save(`informe-pepe-${safeName}-${codigo}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Documento oficial de práctica · ISPM N°1
        </p>
        <Button onClick={download} disabled={downloading} size="sm">
          {downloading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Descargar informe (PDF)
        </Button>
      </div>

      <div
        ref={docRef}
        className="relative mx-auto overflow-hidden rounded-md bg-white text-neutral-900 shadow-sm"
        style={{
          width: "100%",
          maxWidth: 820,
          fontFamily:
            'Georgia, "Times New Roman", ui-serif, Cambria, "Liberation Serif", serif',
          borderTop: `6px solid ${AZUL}`,
          borderBottom: `3px solid ${ROJO}`,
        }}
      >
        {preview && (
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
                color: AZUL,
                opacity: 0.08,
                fontFamily:
                  'Georgia, "Times New Roman", ui-serif, Cambria, serif',
                whiteSpace: "nowrap",
              }}
            >
              VISTA PREVIA
            </span>
          </div>
        )}

        <div className="relative z-20 p-8 sm:p-10">
          {/* Encabezado institucional */}
          <header
            className="flex items-center gap-5 pb-5"
            style={{ borderBottom: `2px solid ${AZUL}` }}
          >
            <img
              src={ispmLogoAsset.url}
              alt="Escudo Instituto Superior Politécnico Misiones N°1"
              crossOrigin="anonymous"
              style={{ width: 84, height: 84, objectFit: "contain" }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: ROJO, fontWeight: 700 }}
              >
                Instituto Superior Politécnico Misiones N°1
              </p>
              <p
                className="mt-0.5 text-lg font-bold leading-tight"
                style={{ color: AZUL }}
              >
                Tecnicatura Superior en Automatización y Robótica
              </p>
              <p className="mt-0.5 text-xs italic text-neutral-600">
                Sistema PEPE — Maniquí robótico de práctica de RCP
              </p>
            </div>
          </header>

          {/* Título del documento */}
          <div className="py-6 text-center">
            <h2
              className="text-2xl font-bold uppercase tracking-wider"
              style={{ color: AZUL }}
            >
              Constancia de Práctica
            </h2>
            <p
              className="mx-auto mt-1 h-[3px] w-24"
              style={{ background: ROJO }}
            />
            <p className="mt-3 text-sm text-neutral-600">
              Registro interno de sesión de Reanimación Cardiopulmonar
            </p>
          </div>

          {/* Datos del alumno */}
          <section className="mb-6">
            <SectionTitle>Datos de la práctica</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Row k="Alumno / Alumna" v={data.estudiante || "—"} />
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
                  value={String(data.totalCompresiones)}
                />
                <ResultRow
                  label="Ventilaciones totales"
                  value={String(
                    stats?.totalVentilaciones ?? data.totalVentilacionesLocal,
                  )}
                />
                <ResultRow
                  label="Compresiones en los últimos 30 s"
                  value={String(data.cuentaPress30s)}
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
            className="mt-8 rounded-md p-5"
            style={{
              border: `1.5px solid ${AZUL}`,
              background: "#F7F8FC",
            }}
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

            <p className="mt-4 text-[12.5px] leading-relaxed text-neutral-800">
              Este código certifica que{" "}
              <strong>{data.estudiante || "el/la alumno/a"}</strong> realizó y
              completó la práctica de Reanimación Cardiopulmonar (RCP)
              registrada por el sistema PEPE, en el marco de la Tecnicatura
              Superior en Automatización y Robótica del Instituto Superior
              Politécnico Misiones N°1, el {fechaLarga}. Este documento
              constituye un registro interno de la práctica realizada y no
              reemplaza certificaciones oficiales de primeros auxilios o RCP.
            </p>

            <div
              className="mt-5 flex items-end justify-between gap-6 pt-6"
              style={{ borderTop: `1px dashed ${AZUL}` }}
            >
              <div className="flex-1">
                <div
                  style={{ borderTop: `1px solid #111` }}
                  className="mt-8 pt-1 text-center text-[11px] uppercase tracking-wider text-neutral-600"
                >
                  Firma del instructor
                </div>
              </div>
              <div className="flex-1">
                <div
                  style={{ borderTop: `1px solid #111` }}
                  className="mt-8 pt-1 text-center text-[11px] uppercase tracking-wider text-neutral-600"
                >
                  Sello institucional
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500">
            <span>
              Documento generado por el sistema PEPE · ISPM N°1
            </span>
            <span className="font-mono">{codigo}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ color: AZUL, borderBottom: `1px solid ${ROJO}`, paddingBottom: 4 }}
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
