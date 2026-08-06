import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { usePepe } from "@/lib/pepe-store";

export function LiveChart({ height = 240 }: { height?: number }) {
  const { state, params } = usePepe();
  const data = state.compresiones.map((p) => ({
    t: (p.t / 1000).toFixed(1),
    cm: p.cm,
  }));
  const max = Math.max(state.lecturaMaximaCMPresion, params.objetivoProfundidadMax + 2);

  if (data.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-6 text-center"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          Iniciá la práctica para ver tu curva en tiempo real
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="cmFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            label={{ value: "s", position: "insideBottomRight", offset: -2, fontSize: 10, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            domain={[0, max]}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            width={38}
            label={{ value: "cm", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--color-muted-foreground)" }}
          />
          <ReferenceArea
            y1={params.objetivoProfundidadMin}
            y2={params.objetivoProfundidadMax}
            fill="var(--color-success)"
            fillOpacity={0.12}
            stroke="var(--color-success)"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
          />
          <ReferenceLine
            y={params.objetivoProfundidadMin}
            stroke="var(--color-success)"
            strokeDasharray="2 2"
            strokeOpacity={0.6}
          />
          <ReferenceLine
            y={params.objetivoProfundidadMax}
            stroke="var(--color-success)"
            strokeDasharray="2 2"
            strokeOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="cm"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#cmFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
