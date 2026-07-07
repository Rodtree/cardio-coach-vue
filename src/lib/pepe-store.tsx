import {
  createContext,
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
  duracionPrueba: number; // segundos
  objetivoProfundidadMin: number; // cm
  objetivoProfundidadMax: number; // cm
  objetivoCompresionesPorMin: number;
  wsUrl: string;
}

const PARAM_KEY = "pepe.params";
const AUTH_KEY = "pepe.docenteAuth";
export const DOCENTE_PASSWORD = "pepe2026";

const DEFAULT_PARAMS: Params = {
  duracionPrueba: 300,
  objetivoProfundidadMin: 5,
  objetivoProfundidadMax: 6,
  objetivoCompresionesPorMin: 110,
  wsUrl: "ws://192.168.10.1:81",
};

export interface CompresionPoint {
  t: number; // ms desde inicio
  cm: number;
}

export interface PepeState {
  status: ConnStatus;
  bateria: number | null;
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
}

interface PepeContextValue {
  state: PepeState;
  params: Params;
  setParams: (p: Params) => void;
  connect: (url?: string) => void;
  disconnect: () => void;
  sendStart: (estudiante: string, duracionPrueba: number) => void;
  sendStop: () => void;
  sendReset: () => void;
  isDocente: boolean;
  loginDocente: (pw: string) => boolean;
  logoutDocente: () => void;
}

const PepeContext = createContext<PepeContextValue | null>(null);

const initialState: PepeState = {
  status: "disconnected",
  bateria: null,
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
  const wsRef = useRef<WebSocket | null>(null);
  const startTsRef = useRef<number>(Date.now());
  const reconnectRef = useRef<number | null>(null);

  // Hydrate from localStorage on client
  useEffect(() => {
    setParamsState(loadParams());
    setIsDocente(localStorage.getItem(AUTH_KEY) === "1");
  }, []);

  const setParams = (p: Params) => {
    setParamsState(p);
    try {
      localStorage.setItem(PARAM_KEY, JSON.stringify(p));
    } catch {}
  };

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

  const connect = (url?: string) => {
    const target = url ?? params.wsUrl;
    if (wsRef.current && wsRef.current.readyState <= 1) {
      wsRef.current.close();
    }
    setState((s) => ({ ...s, status: "connecting" }));
    try {
      const ws = new WebSocket(target);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, status: "connected" }));
      };
      ws.onclose = () => {
        setState((s) => ({ ...s, status: "disconnected" }));
        // simple auto-retry
        if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
        reconnectRef.current = window.setTimeout(() => connect(target), 4000);
      };
      ws.onerror = () => {
        setState((s) => ({ ...s, status: "error" }));
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
    } catch {
      setState((s) => ({ ...s, status: "error" }));
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

  const handleMessage = (msg: { type?: string; [k: string]: unknown }) => {
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
          lecturaMaximaCMPresion:
            Number(msg.lecturaMaximaCMPresion) || s.lecturaMaximaCMPresion,
        }));
        break;
      }
      case "cargaBateria": {
        setState((s) => ({
          ...s,
          bateria: Number(msg.porcentajeCargaBatt) || 0,
        }));
        break;
      }
    }
  };

  const send = (payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const sendStart = (estudiante: string, duracionPrueba: number) => {
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
      sesionActiva: true,
    }));
    send({
      type: "envioComandoaESP",
      estadoConexion: "start",
      estudiante,
      duracionPrueba,
    });
  };
  const sendStop = () => {
    send({ type: "envioComandoaESP", estadoConexion: "stop" });
    setState((s) => ({ ...s, sesionActiva: false }));
  };
  const sendReset = () => {
    send({ type: "envioComandoaESP", estadoConexion: "reset" });
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

  useEffect(() => {
    // no auto-connect until a page opts in
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
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
    }),
    [state, params, isDocente],
  );

  return <PepeContext.Provider value={value}>{children}</PepeContext.Provider>;
}

export function usePepe() {
  const ctx = useContext(PepeContext);
  if (!ctx) throw new Error("usePepe fuera de PepeProvider");
  return ctx;
}

// Auto-connect helper
export function useAutoConnect() {
  const { state, connect, params } = usePepe();
  useEffect(() => {
    if (state.status === "disconnected") {
      connect(params.wsUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
