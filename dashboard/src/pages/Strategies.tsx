import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { getStrategies } from "../api.js";
import {
  C,
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  useBeginnerMode,
} from "../context.js";

interface Strategy {
  id: string;
  name: string;
  type: string;
  description?: string;
  regimeFit?: string[];
  isActive?: boolean;
  activeSignals?: number;
  winRate?: number;
  performanceHistory?: { date: string; pnl: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  MOMENTUM: "#6366f1",
  MEAN_REVERSION: "#8b5cf6",
  BREAKOUT: "#f97316",
  OPTIONS: "#eab308",
  TREND: C.green,
  ARBITRAGE: "#06b6d4",
  VOLATILITY: C.red,
  SECTOR_ROTATION: "#3b82f6",
  RISK_OFF: C.amber,
  SHORT: C.red,
  PENNY: "#a855f7",
};

const BEGINNER_EXPLANATIONS: Record<string, string> = {
  MOMENTUM: "Buys assets that are already going up. Like surfing — ride the wave.",
  MEAN_REVERSION: "Buys assets that dropped too far too fast. Like a rubber band snapping back.",
  SECTOR_ROTATION: "Follows where big money is flowing. If tech is hot, buy tech ETFs.",
  RISK_OFF: "When danger signals flash, move to cash and safe assets.",
  SHORT: "Profit when stocks go DOWN. Uses put options or inverse ETFs.",
  PENNY: "Cheap stocks with explosive volume. Very high risk, potential 10x returns.",
  TREND: "Follows the prevailing market direction — up in bull markets, down in bear markets.",
  BREAKOUT: "Buys when a stock breaks above a resistance level with strong volume.",
  OPTIONS: "Uses options contracts to profit from volatility or directional moves.",
  VOLATILITY: "Profits from changes in market volatility, not just price direction.",
  ARBITRAGE: "Exploits tiny price differences between similar assets for near-risk-free profit.",
};

function Sparkline({ data }: { data: { date: string; pnl: number }[] }) {
  if (!data || data.length < 2) return null;
  const lastPnl = data[data.length - 1]?.pnl ?? 0;
  const lineColor = lastPnl >= 0 ? C.green : C.red;

  return (
    <div style={{ height: 48, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Tooltip
            contentStyle={{
              background: "#1a2332",
              border: `1px solid ${C.border}`,
              color: C.textPrimary,
              fontSize: 11,
              padding: "4px 8px",
            }}
            formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "P&L"]}
            labelFormatter={() => ""}
          />
          <Line type="monotone" dataKey="pnl" stroke={lineColor} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StrategyCard({
  strategy,
  onClick,
}: {
  strategy: Strategy;
  onClick: () => void;
}) {
  const { beginnerMode } = useBeginnerMode();
  const [hovered, setHovered] = useState(false);
  const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
  const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
  const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;
  const begExp = BEGINNER_EXPLANATIONS[typeKey];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card,
        border: `1px solid ${hovered ? typeColor + "55" : C.border}`,
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? `0 0 16px ${typeColor}18` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            {strategy.name}
          </div>
          <Badge label={strategy.type ?? "UNKNOWN"} color={typeColor} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: strategy.isActive ? C.green : C.textMuted,
              boxShadow: strategy.isActive ? `0 0 6px ${C.green}88` : "none",
            }}
          />
          <span style={{ color: strategy.isActive ? C.green : C.textMuted, fontSize: 12 }}>
            {strategy.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Description */}
      {strategy.description && (
        <p style={{ color: C.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          {strategy.description}
        </p>
      )}

      {/* Beginner explanation */}
      {beginnerMode && begExp && (
        <div
          style={{
            background: `${typeColor}0d`,
            border: `1px solid ${typeColor}33`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: C.textSecondary,
            fontStyle: "italic",
          }}
        >
          💡 {begExp}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {strategy.activeSignals != null && (
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>Active Signals</div>
            <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600 }}>
              {strategy.activeSignals}
            </div>
          </div>
        )}
        {strategy.winRate != null && (
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>Win Rate</div>
            <div
              style={{
                color: strategy.winRate >= 50 ? C.green : C.red,
                fontSize: 16,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {strategy.winRate.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Regime fit */}
      {(strategy.regimeFit ?? []).length > 0 && (
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Best In
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(strategy.regimeFit ?? []).map((r) => (
              <span
                key={r}
                style={{
                  color: C.textSecondary,
                  background: "#1e293b",
                  border: `1px solid #334155`,
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Performance sparkline */}
      {hasPerf && <Sparkline data={strategy.performanceHistory!} />}

      <div style={{ color: C.textMuted, fontSize: 11, marginTop: "auto" }}>
        Click to view details →
      </div>
    </div>
  );
}

function StrategyDetail({ strategy, onBack }: { strategy: Strategy; onBack: () => void }) {
  const { beginnerMode } = useBeginnerMode();
  const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
  const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
  const begExp = BEGINNER_EXPLANATIONS[typeKey];
  const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "7px 14px",
          color: C.textSecondary,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 24,
          transition: "border-color 0.12s",
        }}
      >
        ← Back to Strategies
      </button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0, marginBottom: 8 }}>
              {strategy.name}
            </h2>
            <Badge label={typeKey} color={typeColor} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: strategy.isActive ? C.green : C.textMuted,
                boxShadow: strategy.isActive ? `0 0 8px ${C.green}88` : "none",
              }}
            />
            <span style={{ color: strategy.isActive ? C.green : C.textMuted, fontSize: 14, fontWeight: 500 }}>
              {strategy.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {strategy.description && (
          <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7, margin: 0, marginBottom: 16 }}>
            {strategy.description}
          </p>
        )}

        {/* How it works */}
        {begExp && (
          <div
            style={{
              background: `${typeColor}0d`,
              border: `1px solid ${typeColor}44`,
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 16,
            }}
          >
            <div style={{ color: typeColor, fontWeight: 600, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              How It Works
            </div>
            <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
              {begExp}
            </div>
            {beginnerMode && (
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                Think of this strategy as a systematic rule: when certain conditions are met, it
                generates a buy or sell signal automatically.
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {strategy.activeSignals != null && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Active Signals</div>
              <div style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700 }}>{strategy.activeSignals}</div>
            </div>
          )}
          {strategy.winRate != null && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Win Rate</div>
              <div style={{ color: strategy.winRate >= 50 ? C.green : C.red, fontSize: 20, fontWeight: 700 }}>
                {strategy.winRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Regime fit */}
      {(strategy.regimeFit ?? []).length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Best Market Conditions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(strategy.regimeFit ?? []).map((r) => (
              <Badge key={r} label={r} color={C.blue} />
            ))}
          </div>
        </Card>
      )}

      {/* Performance */}
      {hasPerf && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Historical Performance
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={strategy.performanceHistory}>
                <Tooltip
                  contentStyle={{ background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "P&L"]}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke={
                    (strategy.performanceHistory?.at(-1)?.pnl ?? 0) >= 0 ? C.green : C.red
                  }
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

export function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Strategy | null>(null);

  async function load() {
    try {
      const data = await getStrategies();
      setStrategies(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (selected) {
    return (
      <div style={{ padding: 28 }}>
        <StrategyDetail strategy={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Strategies
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Active and available trading strategies — click to explore
        </p>
      </div>

      {error && <ErrorBanner message={`Failed to load strategies: ${error}`} onRetry={load} />}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={200} />)}
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No strategies configured"
          subtitle="Strategies will appear here once they are set up."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onClick={() => setSelected(strategy)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
