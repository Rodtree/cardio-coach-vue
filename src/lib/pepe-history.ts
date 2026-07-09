// Historial de prácticas usando File System Access API + IndexedDB.
// Guarda el handle del directorio elegido para reusarlo entre sesiones.

export interface HistorialEntry {
  codigo: string;
  estudiante: string;
  fechaISO: string;
  duracionPrueba: number;
  totalCompresiones: number;
  totalVentilaciones: number;
  cuentaPress30s: number;
  archivo: string; // nombre del PDF
}

export interface HistorialIndex {
  version: 1;
  actualizado: string;
  entradas: HistorialEntry[];
}

const DB_NAME = "pepe-fs";
const STORE = "handles";
const HANDLE_KEY = "informes-dir";
const INDEX_FILE = "indice.json";

export function isFsAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSavedDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const h = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY);
    return h ?? null;
  } catch {
    return null;
  }
}

export async function pickDirHandle(): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error non-standard, feature-detected
  const h: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    id: "pepe-informes",
    mode: "readwrite",
  });
  await idbSet(HANDLE_KEY, h);
  return h;
}

export async function clearDirHandle() {
  await idbDel(HANDLE_KEY);
}

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  write = true,
): Promise<PermissionState> {
  const opts = { mode: write ? "readwrite" : "read" } as unknown as { mode: "read" | "readwrite" };
  // @ts-expect-error non-standard
  const q: PermissionState = await handle.queryPermission(opts);
  if (q === "granted") return "granted";
  // @ts-expect-error non-standard
  const r: PermissionState = await handle.requestPermission(opts);
  return r;
}

async function readIndex(dir: FileSystemDirectoryHandle): Promise<HistorialIndex> {
  try {
    const fh = await dir.getFileHandle(INDEX_FILE);
    const f = await fh.getFile();
    const txt = await f.text();
    const data = JSON.parse(txt) as HistorialIndex;
    if (!data.entradas) throw new Error("bad");
    return data;
  } catch {
    return { version: 1, actualizado: new Date().toISOString(), entradas: [] };
  }
}

async function writeIndex(dir: FileSystemDirectoryHandle, idx: HistorialIndex) {
  const fh = await dir.getFileHandle(INDEX_FILE, { create: true });
  const w = await fh.createWritable();
  await w.write(new Blob([JSON.stringify(idx, null, 2)], { type: "application/json" }));
  await w.close();
}

async function writePdf(
  dir: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob,
) {
  const fh = await dir.getFileHandle(filename, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

export async function savePracticaToFolder(
  dir: FileSystemDirectoryHandle,
  entry: HistorialEntry,
  pdf: Blob,
): Promise<void> {
  await writePdf(dir, entry.archivo, pdf);
  const idx = await readIndex(dir);
  // dedupe por código
  const filtered = idx.entradas.filter((e) => e.codigo !== entry.codigo);
  filtered.unshift(entry);
  await writeIndex(dir, {
    version: 1,
    actualizado: new Date().toISOString(),
    entradas: filtered,
  });
}

export async function listHistorial(
  dir: FileSystemDirectoryHandle,
): Promise<HistorialEntry[]> {
  const idx = await readIndex(dir);
  return idx.entradas.sort((a, b) => (a.fechaISO < b.fechaISO ? 1 : -1));
}

export async function openHistorialPdf(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<Blob | null> {
  try {
    const fh = await dir.getFileHandle(filename);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export async function removeHistorialEntry(
  dir: FileSystemDirectoryHandle,
  codigo: string,
): Promise<void> {
  const idx = await readIndex(dir);
  const entry = idx.entradas.find((e) => e.codigo === codigo);
  if (entry) {
    try {
      await dir.removeEntry(entry.archivo);
    } catch {
      // ignore
    }
  }
  await writeIndex(dir, {
    version: 1,
    actualizado: new Date().toISOString(),
    entradas: idx.entradas.filter((e) => e.codigo !== codigo),
  });
}
