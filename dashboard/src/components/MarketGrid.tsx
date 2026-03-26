import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { C, getScoreColor, getScoreLabel, Badge, REGIME_COLORS } from "../context.js";

interface MarketScore {
  id: string;
  market: string;
  crashScore: number | string;
  componentScores?: {
    volatility?: number;
    sentiment?: number;
    macro?: number;
    credit?: number;
  };
  calculatedAt: string;
}

interface Props {
  scores: MarketScore[];
  regimeByMarket?: Record<string, string>;
  sparklineData?: Record<string, Array<{ score: number }>>;
}

const MARKET_INFO: Record<string, { label: string; flag: string }> = {
  us: { label: "US Markets", flag: "🇺🇸" },
  eu: { label: "EU Markets", flag: "🇪🇺" },
  asia: { label: "Asian Markets", flag: "🇯🇵" },
  global: { label: "Global", flag: "🌐" },
};

function ComponentBar({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.textMuted, fontSize: 11, textTransform: "capitalize" }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 600 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function MarketCard({
  score,
  regime,
  sparkline,
}: {
  score: MarketScore;
  regime?: string;
  sparkline?: Array<{ score: number }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const value = Number(score.crashScore);
  const color = getScoreColor(value);
  const info = MARKET_INFO[score.market] ?? { label: score.market, flag: "🌐" };
  const regimeColor = regime ? (REGIME_COLORS[regime] ?? C.textMuted) : undefined;
  const components = score.componentScores;

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${expanded ? color + "55" : C.border}`,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: expanded ? `0 0 16px ${color}22` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{info.flag}</span>
            <span style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>{info.label}</span>
          </div>
          {regime && (
            <Badge label={regime} color={regimeColor} />
          )}
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 1 && (
          <div style={{ width: 60, height: 28, opacity: 0.7 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={color}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toFixed(0)}
        </span>
        <span style={{ color: C.textMuted, fontSize: 13 }}>{getScoreLabel(value)}</span>
      </div>

      <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>
        Updated {new Date(score.calculatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {" · "}
        <span style={{ color: C.textMuted }}>click to {expanded ? "collapse" : "expand"}</span>
      </div>

      {/* Expanded component breakdown */}
      {expanded && components && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Component Scores
          </div>
          {Object.entries(components).map(([k, v]) =>
            v != null ? <ComponentBar key={k} label={k} value={Number(v)} /> : null
          )}
        </div>
      )}
    </div>
  );
}

export function MarketGrid({ scores, regimeByMarket = {}, sparklineData = {} }: Props) {
  const marketScores = scores.filter((s) => s.market !== "global");

  if (marketScores.length === 0) {
    return (
      <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0" }}>
        No per-market data available
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
      {marketScores.map((score) => (
        <MarketCard
          key={score.market}
          score={score}
          regime={regimeByMarket[score.market]}
          sparkline={sparklineData[score.market]}
        />
      ))}
    </div>
  );
}
