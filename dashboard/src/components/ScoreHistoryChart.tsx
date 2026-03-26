import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { C, getScoreColor } from "../context.js";

interface ChartPoint {
  time: string;
  date: string;
  score: number;
  regime?: string;
}

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 730 },
];

interface Props {
  market?: string;
  initialDays?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value as number;
  const regime = payload[0]?.payload?.regime;
  return (
    <div
      style={{
        background: "#1a2332",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ color: C.textSecondary, marginBottom: 4 }}>{payload[0]?.payload?.date || label}</div>
      <div style={{ color: getScoreColor(score), fontWeight: 700, fontSize: 16 }}>
        {score?.toFixed(1)}
      </div>
      {regime && (
        <div style={{ color: C.textMuted, marginTop: 2 }}>
          Regime: {regime}
        </div>
      )}
    </div>
  );
}

export function ScoreHistoryChart({ market = "global", initialDays = 30 }: Props) {
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/v1/score/history?market=${encodeURIComponent(market)}&days=${days}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const points: ChartPoint[] = [...data]
          .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
          .map((s) => {
            const d = new Date(s.calculatedAt);
            return {
              time: d.toLocaleDateString([], { month: "short", day: "numeric" }),
              date: d.toLocaleString(),
              score: Number(s.crashScore),
              regime: s.regime,
            };
          });
        setHistory(points);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [market, days]);

  // Gradient color based on score
  const lastScore = history.length > 0 ? history[history.length - 1].score : 50;
  const gradColor = getScoreColor(lastScore);

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: "18px 20px",
      }}
    >
      {/* Range selector */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 16 }}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setDays(opt.days)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${days === opt.days ? C.blue + "66" : "transparent"}`,
              background: days === opt.days ? C.blue + "22" : "transparent",
              color: days === opt.days ? C.blue : C.textMuted,
              fontSize: 12,
              fontWeight: days === opt.days ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="skeleton"
          style={{ width: "100%", height: 280, borderRadius: 8 }}
        />
      ) : history.length === 0 ? (
        <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
          No score history available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2436" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#2a3a50"
              tick={{ fill: C.textMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#2a3a50"
              tick={{ fill: C.textMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={75}
              stroke="#ef444488"
              strokeDasharray="5 3"
              label={{ value: "Critical", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }}
            />
            <ReferenceLine
              y={50}
              stroke="#f59e0b88"
              strokeDasharray="5 3"
              label={{ value: "High", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={gradColor}
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={false}
              activeDot={{ r: 4, fill: gradColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
