import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { getStrategies, getStrategyPerformance } from "../api.js";
import {
  C,
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  useExpertise,
  TH,
  TD,
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

interface StrategyPerf {
  id?: string;
  name: string;
  type?: string;
  signalCount?: number;
  signals?: number;
  winRate?: number;
  avgReturn?: number;
  totalPnl?: number;
  benchmarkPnl?: number;
  description?: string;
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

function WinRateBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 60 ? C.green : pct >= 50 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: "monospace", minWidth: 38 }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function PnLVsBenchmark({ total, benchmark }: { total?: number; benchmark?: number }) {
  if (total == null) return <span style={{ color: C.textMuted }}>—</span>;
  const color = total >= 0 ? C.green : C.red;
  const vsBench = benchmark != null ? total - benchmark : null;
  return (
    <div>
      <span style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>
        {total >= 0 ? "+" : ""}{total.toFixed(2)}%
      </span>
      {vsBench != null && (
        <div style={{ color: vsBench >= 0 ? C.green : C.red, fontSize: 10, marginTop: 1 }}>
          {vsBench >= 0 ? "+" : ""}{vsBench.toFixed(2)}% vs bench
        </div>
      )}
    </div>
  );
}

function Sparkline({ data }: { data: { date: string; pnl: number }[] }) {
  if (!data || data.length < 2) return null;
  const lastPnl = data[data.length - 1]?.pnl ?? 0;
  const lineColor = lastPnl >= 0 ? C.green : C.red;
  return (
    <div style={{ height: 40, width: 80 }}>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Tooltip
            contentStyle={{ background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 11, padding: "3px 7px" }}
            formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "P&L"]}
            labelFormatter={() => ""}
          />
          <Line type="monotone" dataKey="pnl" stroke={lineColor} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpandedDescription({
  strategy,
  perf,
}: {
  strategy?: Strategy;
  perf?: StrategyPerf;
}) {
  const { isBeginner: beginnerMode } = useExpertise();
  const typeKey = (strategy?.type ?? perf?.type ?? "").toUpperCase();
  const begExp = BEGINNER_EXPLANATIONS[typeKey];
  const desc = strategy?.description ?? perf?.description;

  if (!desc && !begExp) return null;

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: `1px solid ${C.border}`,
        background: "#090f1a",
      }}
    >
      {desc && (
        <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }}>
          {desc}
        </p>
      )}
      {begExp && (
        <div
          style={{
            background: `${TYPE_COLORS[typeKey] ?? C.blue}0d`,
            border: `1px solid ${TYPE_COLORS[typeKey] ?? C.blue}33`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <div style={{ color: TYPE_COLORS[typeKey] ?? C.blue, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            How It Works
          </div>
          <div style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.6 }}>{begExp}</div>
          {beginnerMode && (
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
              Think of this strategy as a systematic rule: when certain conditions are met, it generates a buy or sell signal automatically.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerformanceTable({
  perfs,
  strategies,
  onSelect,
}: {
  perfs: StrategyPerf[];
  strategies: Strategy[];
  onSelect: (name: string) => void;
}) {
  const [expandedName, setExpandedName] = useState<string | null>(null);

  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 28 }}>#</th>
              <th style={TH}>Strategy</th>
              <th style={TH}>Type</th>
              <th style={TH}>Signals</th>
              <th style={{ ...TH, minWidth: 130 }}>Win Rate</th>
              <th style={TH}>Avg Return</th>
              <th style={{ ...TH, minWidth: 110 }}>Total P&L</th>
              <th style={TH}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {perfs.map((p, i) => {
              const typeKey = (p.type ?? "").toUpperCase();
              const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
              const strat = strategies.find((s) => s.name === p.name);
              const isExpanded = expandedName === p.name;

              return (
                <>
                  <tr
                    key={p.name}
                    onClick={() => setExpandedName(isExpanded ? null : p.name)}
                    style={{
                      cursor: "pointer",
                      background: isExpanded ? "#0d1b2e" : i % 2 === 0 ? "transparent" : "#090e18",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "#111a2e"; }}
                    onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "transparent" : "#090e18"; }}
                  >
                    <td style={{ ...TD, color: C.textMuted, fontWeight: 600 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </td>
                    <td style={{ ...TD, color: C.textPrimary, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.name}
                        <span style={{ color: C.textMuted, fontSize: 10 }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </td>
                    <td style={TD}>
                      {p.type && <Badge label={typeKey || p.type} color={typeColor} style={{ fontSize: 10 }} />}
                    </td>
                    <td style={{ ...TD, fontFamily: "monospace", color: C.textSecondary }}>
                      {p.signalCount ?? p.signals ?? "—"}
                    </td>
                    <td style={TD}>
                      {p.winRate != null ? <WinRateBar value={p.winRate} /> : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    <td style={{ ...TD, fontFamily: "monospace" }}>
                      {p.avgReturn != null ? (
                        <span style={{ color: p.avgReturn >= 0 ? C.green : C.red, fontWeight: 600 }}>
                          {p.avgReturn >= 0 ? "+" : ""}{p.avgReturn.toFixed(2)}%
                        </span>
                      ) : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    <td style={TD}>
                      <PnLVsBenchmark total={p.totalPnl} benchmark={p.benchmarkPnl} />
                    </td>
                    <td style={TD}>
                      {strat?.performanceHistory && strat.performanceHistory.length >= 2 ? (
                        <Sparkline data={strat.performanceHistory} />
                      ) : (
                        <span style={{ color: C.textMuted }}>—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${p.name}-exp`}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <ExpandedDescription strategy={strat} perf={p} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategyDetail({ strategy, onBack }: { strategy: Strategy; onBack: () => void }) {
  const { isBeginner: beginnerMode } = useExpertise();
  const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
  const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
  const begExp = BEGINNER_EXPLANATIONS[typeKey];
  const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "7px 14px", color: C.textSecondary, fontSize: 13,
          cursor: "pointer", marginBottom: 24, transition: "border-color 0.12s",
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
                width: 10, height: 10, borderRadius: "50%",
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

        {begExp && (
          <div
            style={{
              background: `${typeColor}0d`, border: `1px solid ${typeColor}44`,
              borderRadius: 10, padding: "14px 18px", marginBottom: 16,
            }}
          >
            <div style={{ color: typeColor, fontWeight: 600, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              How It Works
            </div>
            <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{begExp}</div>
            {beginnerMode && (
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                Think of this strategy as a systematic rule: when certain conditions are met, it generates a buy or sell signal automatically.
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {strategy.activeSignals != null && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Active Signals</div>
              <div style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{strategy.activeSignals}</div>
            </div>
          )}
          {strategy.winRate != null && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Win Rate</div>
              <div style={{ color: strategy.winRate >= 50 ? C.green : C.red, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>
                {strategy.winRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card>

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
                  type="monotone" dataKey="pnl"
                  stroke={(strategy.performanceHistory?.at(-1)?.pnl ?? 0) >= 0 ? C.green : C.red}
                  dot={false} strokeWidth={2} isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function StrategyCard({ strategy, onClick }: { strategy: Strategy; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
  const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
  const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card,
        border: `1px solid ${hovered ? typeColor + "55" : C.border}`,
        borderRadius: 12, padding: "20px 22px",
        cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? `0 0 16px ${typeColor}18` : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{strategy.name}</div>
          <Badge label={strategy.type ?? "UNKNOWN"} color={typeColor} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: strategy.isActive ? C.green : C.textMuted, boxShadow: strategy.isActive ? `0 0 6px ${C.green}88` : "none" }} />
          <span style={{ color: strategy.isActive ? C.green : C.textMuted, fontSize: 12 }}>{strategy.isActive ? "Active" : "Inactive"}</span>
        </div>
      </div>
      {strategy.description && <p style={{ color: C.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{strategy.description}</p>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {strategy.activeSignals != null && (
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>Active Signals</div>
            <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, fontFamily: "monospace" }}>{strategy.activeSignals}</div>
          </div>
        )}
        {strategy.winRate != null && (
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>Win Rate</div>
            <div style={{ color: strategy.winRate >= 50 ? C.green : C.red, fontSize: 16, fontWeight: 600, fontFamily: "monospace" }}>{strategy.winRate.toFixed(1)}%</div>
          </div>
        )}
      </div>
      {hasPerf && <Sparkline data={strategy.performanceHistory!} />}
      <div style={{ color: C.textMuted, fontSize: 11, marginTop: "auto" }}>Click to view details →</div>
    </div>
  );
}

export function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [perfs, setPerfs] = useState<StrategyPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [view, setView] = useState<"leaderboard" | "cards">("leaderboard");

  async function load() {
    try {
      const [strats, perfData] = await Promise.all([
        getStrategies(),
        getStrategyPerformance().catch(() => [] as StrategyPerf[]),
      ]);
      setStrategies(Array.isArray(strats) ? strats : []);
      setPerfs(Array.isArray(perfData) ? perfData : []);
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

  // Merge perf data with strategy cards — use perfs if available, else fall back to strategy list
  const hasPerfs = perfs.length > 0;
  const displayPerfs: StrategyPerf[] = hasPerfs
    ? perfs
    : strategies.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        signalCount: s.activeSignals,
        winRate: s.winRate,
        description: s.description,
      }));

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Strategy Leaderboard
          </h1>
          <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
            Performance ranking · click a row to expand description
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#0d1424", borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
          {(["leaderboard", "cards"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                background: view === v ? C.blue : "transparent",
                color: view === v ? "#fff" : C.textMuted,
                fontSize: 12, fontWeight: view === v ? 600 : 400,
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.12s",
              }}
            >
              {v === "leaderboard" ? "📊 Leaderboard" : "🃏 Cards"}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load strategies: ${error}`} onRetry={load} />}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={52} />)}
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No strategies configured"
          subtitle="Strategies will appear here once they are set up."
        />
      ) : view === "leaderboard" ? (
        <PerformanceTable
          perfs={displayPerfs}
          strategies={strategies}
          onSelect={(name) => {
            const s = strategies.find((st) => st.name === name);
            if (s) setSelected(s);
          }}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} onClick={() => setSelected(strategy)} />
          ))}
        </div>
      )}
    </div>
  );
}
