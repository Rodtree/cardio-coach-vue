import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---- Tipos de mensajes del ESP32 ----
export type ConnStatus = "disconnected" | "connecting" | "connected" | "error";

export interface DatosMediciones {
  conexion?: string;
  accionEnvio?: string;
  cmPresion: number;
}
export interface Presiones {
  cuentaPress: number;
}
export interface Ventilacion {
  cm3ventilados: number;
  duracionVentilacion: number;
}
export interface EstadisticasVentilacion {
  totalVentilaciones: number;
  tiempoPromedioEntreVentilaciones: number;
  duracionPromedioVentilaciones: number;
  airePromedioVentilado: number;
}
export interface DatosIniciales {
  estudiante: string;
  estadoConexion: string;
  lecturaMaximaCMPresion: number;
  duracionPrueba: number;
}

export interface Params {
  duracionPrueba: number;
  objetivoProfundidadMin: number;
  objetivoProfundidadMax: number;
  objetivoCompresionesPorMin: number;
  wsUrl: string;
  instructor: string;
}

const PARAM_KEY = "pepe.params";
const AUTH_KEY = "pepe.docenteAuth";
const DEBUG_KEY = "pepe.debug";
export const DOCENTE_PASSWORD = "pepe2026";

const DEFAULT_PARAMS: Params = {
  duracionPrueba: 300,
  objetivoProfundidadMin: 5,
  objetivoProfundidadMax: 6,
  objetivoCompresionesPorMin: 110,
  wsUrl: "ws://192.168.10.1:81",
  instructor: "",
};


export interface CompresionPoint {
  t: number;
  cm: number;
}

export type TendenciaBateria = "cargando" | "descargando" | "estable";

/** Snapshot inmutable de la última práctica finalizada (para el informe). */
export interface PracticaSnapshot {
  sesionId: string | null;
  sesionStartISO: string | null;
  finISO: string;
  estudiante: string;
  duracionPrueba: number;
  totalCompresiones: number;
  totalVentilacionesLocal: number;
  cuentaPress30s: number;
  estadisticasFinales: EstadisticasVentilacion | null;
}

export interface PepeState {
  status: ConnStatus;
  bateria: number | null;
  tendencia: TendenciaBateria;
  tasaPctPorMin: number;
  minutosRestantesEstimados: number;
  estudiante: string;
  duracionPrueba: number;
  lecturaMaximaCMPresion: number;
  ultimaCompresion: number | null;
  compresiones: CompresionPoint[];
  totalCompresiones: number;
  cuentaPress30s: number;
  ultimaVentilacion: Ventilacion | null;
  totalVentilacionesLocal: number;
  estadisticasFinales: EstadisticasVentilacion | null;
  sesionActiva: boolean;
  sesionId: string | null;
  sesionStartISO: string | null;
  /** Congelado al detener la sesión; sólo se reemplaza al iniciar una nueva. */
  ultimaPractica: PracticaSnapshot | null;
}

function snapshotDe(
  s: PepeState,
  stats?: EstadisticasVentilacion | null,
): PracticaSnapshot {
  return {
    sesionId: s.sesionId,
    sesionStartISO: s.sesionStartISO,
    finISO: new Date().toISOString(),
    estudiante: s.estudiante,
    duracionPrueba: s.duracionPrueba,
    totalCompresiones: s.totalCompresiones,
    totalVentilacionesLocal: s.totalVentilacionesLocal,
    cuentaPress30s: s.cuentaPress30s,
    estadisticasFinales: stats ?? s.estadisticasFinales,
  };
}



export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error" | "event";
  msg: string;
}

interface PepeContextValue {
  state: PepeState;
  params: Params;
  setParams: (p: Params) => void;
  connect: (url?: string) => void;
  disconnect: () => void;
  sendStart: (estudiante: string, duracionPrueba: number) => boolean;
  sendStop: () => void;
  sendReset: () => void;
  isDocente: boolean;
  loginDocente: (pw: string) => boolean;
  logoutDocente: () => void;
  // Debug
  debugMode: boolean;
  setDebugMode: (v: boolean) => void;
  logs: LogEntry[];
  clearLogs: () => void;
  simulating: boolean;
  startSimulation: (estudiante?: string, duracion?: number) => void;
  stopSimulation: () => void;
}

const PepeContext = createContext<PepeContextValue | null>(null);

const initialState: PepeState = {
  status: "disconnected",
  bateria: null,
  tendencia: "estable",
  tasaPctPorMin: 0,
  minutosRestantesEstimados: -1,
  estudiante: "",
  duracionPrueba: 300,
  lecturaMaximaCMPresion: 6,
  ultimaCompresion: null,
  compresiones: [],
  totalCompresiones: 0,
  cuentaPress30s: 0,
  ultimaVentilacion: null,
  totalVentilacionesLocal: 0,
  estadisticasFinales: null,
  sesionActiva: false,
  sesionId: null,
  sesionStartISO: null,
  ultimaPractica: null,


};

function loadParams(): Params {
  if (typeof window === "undefined") return DEFAULT_PARAMS;
  try {
    const raw = localStorage.getItem(PARAM_KEY);
    if (!raw) return DEFAULT_PARAMS;
    return { ...DEFAULT_PARAMS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PARAMS;
  }
}

export function PepeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PepeState>(initialState);
  const [params, setParamsState] = useState<Params>(DEFAULT_PARAMS);
  const [isDocente, setIsDocente] = useState(false);
  const [debugMode, setDebugModeState] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simulating, setSimulating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const startTsRef = useRef<number>(Date.now());
  const reconnectRef = useRef<number | null>(null);
  const simRef = useRef<{
    tickComp?: number;
    tickVent?: number;
    endTimer?: number;
    ventCount: number;
    ventDurations: number[];
    ventVolumes: number[];
    ventGaps: number[];
    lastVentAt: number;
    press30Window: number[];
  } | null>(null);

  const log = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((prev) => {
      const next = [...prev, { ts: Date.now(), level, msg }];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  useEffect(() => {
    setParamsState(loadParams());
    setIsDocente(localStorage.getItem(AUTH_KEY) === "1");
    setDebugModeState(localStorage.getItem(DEBUG_KEY) === "1");
  }, []);

  const setParams = (p: Params) => {
    setParamsState(p);
    try {
      localStorage.setItem(PARAM_KEY, JSON.stringify(p));
    } catch {}
  };

  const setDebugMode = (v: boolean) => {
    setDebugModeState(v);
    try {
      localStorage.setItem(DEBUG_KEY, v ? "1" : "0");
    } catch {}
    log("info", v ? "Modo debug activado" : "Modo debug desactivado");
  };

  const clearLogs = () => setLogs([]);

  const loginDocente = (pw: string) => {
    if (pw === DOCENTE_PASSWORD) {
      setIsDocente(true);
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {}
      return true;
    }
    return false;
  };
  const logoutDocente = () => {
    setIsDocente(false);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}
  };

  const handleMessage = useCallback(
    (msg: { type?: string; [k: string]: unknown }) => {
      if (!msg || !msg.type) return;
      switch (msg.type) {
        case "datosMediciones": {
          const cm = Number(msg.cmPresion) || 0;
          const t = Date.now() - startTsRef.current;
          setState((s) => {
            const next = [...s.compresiones, { t, cm }].slice(-120);
            return {
              ...s,
              ultimaCompresion: cm,
              compresiones: next,
              totalCompresiones: s.totalCompresiones + 1,
            };
          });
          break;
        }
        case "presiones": {
          setState((s) => ({ ...s, cuentaPress30s: Number(msg.cuentaPress) || 0 }));
          break;
        }
        case "ventilacion": {
          const v: Ventilacion = {
            cm3ventilados: Number(msg.cm3ventilados) || 0,
            duracionVentilacion: Number(msg.duracionVentilacion) || 0,
          };
          setState((s) => ({
            ...s,
            ultimaVentilacion: v,
            totalVentilacionesLocal: s.totalVentilacionesLocal + 1,
          }));
          break;
        }
        case "estadisticasVentilacion": {
          const stats: EstadisticasVentilacion = {
            totalVentilaciones: Number(msg.totalVentilaciones) || 0,
            tiempoPromedioEntreVentilaciones:
              Number(msg.tiempoPromedioEntreVentilaciones) || 0,
            duracionPromedioVentilaciones:
              Number(msg.duracionPromedioVentilaciones) || 0,
            airePromedioVentilado: Number(msg.airePromedioVentilado) || 0,
          };
          setState((s) => ({
            ...s,
            estadisticasFinales: stats,
            sesionActiva: false,
            ultimaPractica: snapshotDe(s, stats),
          }));

          break;
        }
        case "datosIniciales": {
          setState((s) => ({
            ...s,
            estudiante: String(msg.estudiante ?? ""),
            duracionPrueba: Number(msg.duracionPrueba) || s.duracionPrueba,
            lecturaMaximaCMPresion:
              Number(msg.lecturaMaximaCMPresion) || s.lecturaMaximaCMPresion,
          }));
          break;
        }
        case "iniciaGrafica": {
          startTsRef.current = Date.now();
          setState((s) => ({
            ...s,
            compresiones: [],
            totalCompresiones: 0,
            cuentaPress30s: 0,
            totalVentilacionesLocal: 0,
            estadisticasFinales: null,
            sesionActiva: true,
            sesionId:
              s.sesionId ??
              `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            sesionStartISO: s.sesionStartISO ?? new Date().toISOString(),
            lecturaMaximaCMPresion:
              Number(msg.lecturaMaximaCMPresion) || s.lecturaMaximaCMPresion,
          }));
          break;

        }
        case "cargaBateria": {
          const tRaw = String(msg.tendencia ?? "estable");
          const tendencia: TendenciaBateria =
            tRaw === "cargando" || tRaw === "descargando" ? tRaw : "estable";
          setState((s) => ({
            ...s,
            bateria: Number(msg.porcentajeCargaBatt) || 0,
            tendencia,
            tasaPctPorMin: Number(msg.tasaPctPorMin) || 0,
            minutosRestantesEstimados:
              msg.minutosRestantesEstimados === undefined
                ? -1
                : Number(msg.minutosRestantesEstimados),
          }));
          break;
        }
      }
      log("event", `← ${msg.type}`);
    },
    [log],
  );

  const connect = (url?: string) => {
    if (simulating) {
      log("warn", "Simulación activa: se ignora conexión real");
      return;
    }
    const target = url ?? params.wsUrl;
    const prev = wsRef.current;
    if (prev) {
      prev.onopen = null;
      prev.onclose = null;
      prev.onerror = null;
      prev.onmessage = null;
      if (prev.readyState <= 1) prev.close();
      wsRef.current = null;
    }
    setState((s) => ({ ...s, status: "connecting" }));
    log("info", `Conectando a ${target}`);
    try {
      const ws = new WebSocket(target);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, status: "connected" }));
        log("info", "WebSocket conectado");
        flushPendingStart();
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setState((s) => ({ ...s, status: "disconnected" }));
        log("warn", "WebSocket cerrado");
        if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
        reconnectRef.current = window.setTimeout(() => connect(target), 4000);
      };
      ws.onerror = () => {
        setState((s) => ({ ...s, status: "error" }));
        log("error", "Error de WebSocket");
      };
      ws.onmessage = (ev) => {
        let msg: { type?: string; [k: string]: unknown };
        try {
          msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        } catch {
          return;
        }
        handleMessage(msg);
      };
    } catch (e) {
      setState((s) => ({ ...s, status: "error" }));
      log("error", `No se pudo abrir WS: ${(e as Error).message}`);
    }
  };

  const disconnect = () => {
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setState((s) => ({ ...s, status: "disconnected" }));
  };

  const send = (payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      log("event", `→ ${JSON.stringify(payload)}`);
      return true;
    }
    return false;
  };

  /** Envía el start pendiente en cuanto la conexión vuelve a abrirse. */
  function flushPendingStart() {
    const pending = pendingStartRef.current;
    if (!pending) return;
    if (pendingTimeoutRef.current) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    pendingStartRef.current = null;
    const ok = send(pending);
    log(ok ? "info" : "error", ok ? "Start pendiente enviado" : "Start pendiente falló");
    if (!ok) setState((s) => ({ ...s, sesionActiva: false }));
  }

  const sendStart = (estudiante: string, duracionPrueba: number): StartResult => {
    startTsRef.current = Date.now();
    setState((s) => ({
      ...s,
      estudiante,
      duracionPrueba,
      compresiones: [],
      totalCompresiones: 0,
      cuentaPress30s: 0,
      totalVentilacionesLocal: 0,
      estadisticasFinales: null,
      ultimaPractica: null,
      sesionActiva: true,
      sesionId: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      sesionStartISO: new Date().toISOString(),
    }));

    if (simulating) {
      startSimulation(estudiante, duracionPrueba);
      return "sent";
    }
    const payload = {
      type: "envioComandoaESP",
      estadoConexion: "start",
      estudiante,
      duracionPrueba,
    };
    if (send(payload)) return "sent";

    // El socket quedó cerrado (típico luego de detener una práctica):
    // encolamos el start y forzamos la reconexión inmediata.
    log("warn", "WebSocket no disponible: start encolado, reconectando");
    pendingStartRef.current = payload;
    if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = window.setTimeout(() => {
      if (!pendingStartRef.current) return;
      pendingStartRef.current = null;
      pendingTimeoutRef.current = null;
      log("error", "No se pudo reconectar para iniciar la práctica");
      setState((s) => ({ ...s, sesionActiva: false }));
    }, 12000);
    reconnectNow();
    return "queued";
  };

  /** Reconecta ya mismo, cancelando el timer de reintento de 4 s. */
  const reconnectNow = () => {
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      if (ws.readyState === WebSocket.OPEN) flushPendingStart();
      return;
    }
    connect(params.wsUrl);
  };

  const sendStop = () => {
    if (simulating) {
      stopSimulation();
      return;
    }
    send({ type: "envioComandoaESP", estadoConexion: "stop" });
    setState((s) => ({
      ...s,
      sesionActiva: false,
      ultimaPractica: snapshotDe(s),
    }));
    // El ESP32 suele cerrar el socket al detener: reconectamos enseguida
    // en vez de esperar el reintento automático de 4 s.
    window.setTimeout(() => reconnectNow(), 300);
  };

  const sendReset = () => {
    if (!simulating) send({ type: "envioComandoaESP", estadoConexion: "reset" });
    setState((s) => ({
      ...s,
      compresiones: [],
      totalCompresiones: 0,
      cuentaPress30s: 0,
      totalVentilacionesLocal: 0,
      estadisticasFinales: null,
      ultimaCompresion: null,
      ultimaVentilacion: null,
    }));
  };

  // ------------- SIMULACIÓN -------------
  const stopSimulation = useCallback(() => {
    const s = simRef.current;
    if (s) {
      if (s.tickComp) window.clearInterval(s.tickComp);
      if (s.tickVent) window.clearInterval(s.tickVent);
      if (s.endTimer) window.clearTimeout(s.endTimer);
      // emitir estadísticas finales
      const total = s.ventCount;
      const durProm =
        s.ventDurations.reduce((a, b) => a + b, 0) / Math.max(1, s.ventDurations.length);
      const airProm =
        s.ventVolumes.reduce((a, b) => a + b, 0) / Math.max(1, s.ventVolumes.length);
      const gapProm =
        s.ventGaps.reduce((a, b) => a + b, 0) / Math.max(1, s.ventGaps.length);
      handleMessage({
        type: "estadisticasVentilacion",
        totalVentilaciones: total,
        tiempoPromedioEntreVentilaciones: gapProm / 1000,
        duracionPromedioVentilaciones: durProm,
        airePromedioVentilado: airProm,
      });
    }
    simRef.current = null;
    setState((st) => ({ ...st, sesionActiva: false }));
    log("info", "Simulación detenida");
  }, [handleMessage, log]);

  const startSimulation = useCallback(
    (estudiante = "Alumno de prueba", duracion = 60) => {
      // Cerrar WS real si estaba
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (simRef.current) stopSimulation();

      setSimulating(true);
      setState((s) => ({
        ...s,
        status: "connected",
        bateria: 87,
        tendencia: "descargando",
        tasaPctPorMin: 0.4,
        minutosRestantesEstimados: 120,
      }));
      log("info", `Iniciando simulación (${estudiante}, ${duracion}s)`);

      handleMessage({
        type: "datosIniciales",
        estudiante,
        estadoConexion: "start",
        lecturaMaximaCMPresion: 8,
        duracionPrueba: duracion,
      });
      handleMessage({ type: "iniciaGrafica", lecturaMaximaCMPresion: 8 });

      const store: NonNullable<typeof simRef.current> = {
        ventCount: 0,
        ventDurations: [],
        ventVolumes: [],
        ventGaps: [],
        lastVentAt: 0,
        press30Window: [],
      };
      simRef.current = store;

      // compresiones ~110/min → ~545 ms
      store.tickComp = window.setInterval(() => {
        const cm = 4.5 + Math.random() * 2.2; // 4.5 - 6.7
        handleMessage({ type: "datosMediciones", cmPresion: Number(cm.toFixed(2)) });
        const now = Date.now();
        store.press30Window.push(now);
        store.press30Window = store.press30Window.filter((t) => now - t <= 30000);
        handleMessage({ type: "presiones", cuentaPress: store.press30Window.length });
      }, 545);

      // ventilaciones cada ~6s (2 vent / 30 comp)
      store.tickVent = window.setInterval(() => {
        const now = Date.now();
        if (store.lastVentAt) store.ventGaps.push(now - store.lastVentAt);
        store.lastVentAt = now;
        const dur = 900 + Math.random() * 400;
        const vol = 450 + Math.random() * 200;
        store.ventDurations.push(dur);
        store.ventVolumes.push(vol);
        store.ventCount += 1;
        handleMessage({
          type: "ventilacion",
          cm3ventilados: Math.round(vol),
          duracionVentilacion: Math.round(dur),
        });
      }, 6000);

      store.endTimer = window.setTimeout(() => {
        stopSimulation();
      }, duracion * 1000);
    },
    [handleMessage, log, stopSimulation],
  );

  // Cuando debug se apaga, cortar simulación
  useEffect(() => {
    if (!debugMode && simulating) {
      stopSimulation();
      setSimulating(false);
    }
  }, [debugMode, simulating, stopSimulation]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      if (simRef.current) {
        if (simRef.current.tickComp) window.clearInterval(simRef.current.tickComp);
        if (simRef.current.tickVent) window.clearInterval(simRef.current.tickVent);
        if (simRef.current.endTimer) window.clearTimeout(simRef.current.endTimer);
      }
    };
  }, []);

  const value = useMemo<PepeContextValue>(
    () => ({
      state,
      params,
      setParams,
      connect,
      disconnect,
      sendStart,
      sendStop,
      sendReset,
      isDocente,
      loginDocente,
      logoutDocente,
      debugMode,
      setDebugMode,
      logs,
      clearLogs,
      simulating,
      startSimulation: (e?: string, d?: number) =>
        startSimulation(e, d ?? params.duracionPrueba),
      stopSimulation: () => {
        stopSimulation();
        setSimulating(false);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, params, isDocente, debugMode, logs, simulating],
  );

  return <PepeContext.Provider value={value}>{children}</PepeContext.Provider>;
}

export function usePepe() {
  const ctx = useContext(PepeContext);
  if (!ctx) throw new Error("usePepe fuera de PepeProvider");
  return ctx;
}

export function useAutoConnect() {
  const { state, connect, params, simulating } = usePepe();
  useEffect(() => {
    if (!simulating && (state.status === "disconnected" || state.status === "error")) {
      connect(params.wsUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulating, state.status]);
}
