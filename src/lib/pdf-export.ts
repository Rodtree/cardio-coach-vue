// PDF export helpers — captures a DOM element into a jsPDF Blob/download.
import type jsPDFType from "jspdf";

async function loadLibs() {
  // html2canvas-pro: misma API que html2canvas pero soporta oklch()/lab()/color()
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
}

export async function capturePdfBlob(el: HTMLElement): Promise<Blob> {
  const { html2canvas, jsPDF } = await loadLibs();
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const pdf: jsPDFType = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const w = pageW - margin * 2;
  const h = (canvas.height * w) / canvas.width;
  if (h <= pageH - margin * 2) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, w, h);
  } else {
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
      const sH = (slice.height * w) / slice.width;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, w, sH);
      y += slice.height;
      if (y < canvas.height) pdf.addPage();
    }
  }
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilenamePart(s: string) {
  return (s || "sin-nombre")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}
