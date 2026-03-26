import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { C, Card, SectionTitle, SkeletonBlock, Badge, ErrorBanner } from "../context.js";
import { fetchJSON, getSignals, getStrategyPerformance } from "../api.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BacktestResult {
  scenario: string;
  label: string;
  period: { start: string; end: string };
  market: string;
  scores: Array<{
    id: string;
    market: string;
    crashScore: string;
    componentScores: Record<string, number>;
    calculatedAt: string;
  }>;
  peakScore: number;
  avgScore: number;
  daysAbove75: number;
  isSimulated: boolean;
}

interface Signal {
  id: string;
  instrument: string;
  action: string;
  confidence?: number;
  status?: string;
  createdAt?: string;
  outcome?: string | null;
  pnl?: number | null;
}

interface StrategyPerf {
  id?: string;
  name: string;
  winRate?: number;
  totalPnl?: number;
  tradeCount?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { key: "2008", label: "2008 Crisis", icon: "💥", desc: "Sep 2008 – Mar 2009" },
  { key: "2020", label: "COVID Crash", icon: "🦠", desc: "Feb 2020 – Apr 2020" },
  { key: "2022", label: "2022 Bear", icon: "🐻", desc: "Jan 2022 – Oct 2022" },
  { key: "rally", label: "AI Rally", icon: "🚀", desc: "Oct 2022 – Dec 2024" },
];

const SCORE_COLORS: [number, string][] = [
  [90, "#dc2626"],
  [75, "#ea580c"],
  [60, "#d97706"],
  [50, "#ca8a04"],
  [25, "#16a34a"],
  [0, "#15803d"],
];

function getScoreColor(score: number): string {
  for (const [threshold, color] of SCORE_COLORS) {
    if (score >= threshold) return color;
  }
  return C.green;
}

// ---------------------------------------------------------------------------
// Custom tooltip for crash score chart
// ---------------------------------------------------------------------------

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = Number(payload[0]?.value ?? 0);
  return (
    <div
      style={{
        background: "#1a2235",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: C.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ color: getScoreColor(score), fontWeight: 700, fontSize: 16 }}>
        {score.toFixed(1)}
      </div>
      <div style={{ color: C.textMuted, fontSize: 11 }}>Crash Score</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        background: "#0f1624",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "14px 18px",
        flex: 1,
        minWidth: 100,
      }}
    >
      <div style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: color ?? C.textPrimary, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicator heatmap row
// ---------------------------------------------------------------------------

function IndicatorHeatmap({ componentScores }: { componentScores: Record<string, number> }) {
  if (!componentScores || Object.keys(componentScores).length === 0) return null;

  const entries = Object.entries(componentScores).filter(([, v]) => v != null);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
      {entries.map(([key, value]) => {
        const score = Number(value);
        const bg =
          score >= 75
            ? `${C.red}22`
            : score >= 50
            ? `${C.amber}22`
            : score >= 25
            ? `${C.green}22`
            : "#ffffff08";
        const border =
          score >= 75
            ? `${C.red}55`
            : score >= 50
            ? `${C.amber}55`
            : score >= 25
            ? `${C.green}55`
            : C.border;
        const textColor =
          score >= 75 ? C.red : score >= 50 ? C.amber : score >= 25 ? C.green : C.textMuted;

        return (
          <div
            key={key}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: "8px 14px",
              textAlign: "center",
              minWidth: 90,
            }}
          >
            <div style={{ color: C.textMuted, fontSize: 10, textTransform: "capitalize", marginBottom: 4 }}>
              {key}
            </div>
            <div style={{ color: textColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>
              {score.toFixed(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Backtest page
// ---------------------------------------------------------------------------

export function Backtest() {
  const [selectedScenario, setSelectedScenario] = useState("2008");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [strategies, setStrategies] = useState<StrategyPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (scenario: string) => {
    setLoading(true);
    setError(null);
    try {
      const [bt] = await Promise.all([
        fetchJSON<BacktestResult>(`/score/backtest?scenario=${scenario}&market=global`),
      ]);
      setResult(bt);

      // Load signals and strategy performance (best effort)
      getSignals(true)
        .then((sigs) => setSignals(Array.isArray(sigs) ? sigs : []))
        .catch(() => setSignals([]));
      getStrategyPerformance()
        .then((perfs) => setStrategies(Array.isArray(perfs) ? perfs : []))
        .catch(() => setStrategies([]));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedScenario);
  }, [selectedScenario, load]);

  // Prepare chart data — sample to ~100 points for readability
  const chartData = (() => {
    if (!result?.scores?.length) return [];
    const scores = result.scores;
    const step = Math.max(1, Math.floor(scores.length / 100));
    return scores
      .filter((_, i) => i % step === 0)
      .map((s) => ({
        date: new Date(s.calculatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        score: Number(s.crashScore),
        componentScores: s.componentScores,
      }));
  })();

  // Peak component scores for the heatmap (from the peak score data point)
  const peakEntry = result?.scores?.reduce(
    (max, s) => (Number(s.crashScore) > Number(max?.crashScore ?? 0) ? s : max),
    result?.scores?.[0]
  );

  // Strategy bar chart data
  const strategyData = strategies
    .filter((s) => s.winRate != null)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
    .slice(0, 6)
    .map((s) => ({
      name: s.name?.length > 16 ? s.name.slice(0, 14) + "…" : s.name,
      winRate: s.winRate ?? 0,
      pnl: s.totalPnl ?? 0,
    }));

  // Signals during scenario period
  const scenarioInfo = SCENARIOS.find((s) => s.key === selectedScenario);

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Backtesting Engine
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Historical scenario replay — how would MarketPulse have performed during past crises?
        </p>
      </div>

      {/* Scenario Selector */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Select Scenario</SectionTitle>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {SCENARIOS.map((s) => {
            const isActive = selectedScenario === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSelectedScenario(s.key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: isActive ? `1px solid ${C.blue}66` : `1px solid ${C.border}`,
                  background: isActive ? `${C.blue}18` : C.card,
                  color: isActive ? C.blue : C.textSecondary,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  minWidth: 140,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                <span style={{ color: C.textMuted, fontSize: 11 }}>{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load backtest: ${error}`} onRetry={() => load(selectedScenario)} />}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SkeletonBlock height={80} />
          <SkeletonBlock height={280} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <SkeletonBlock height={200} />
            <SkeletonBlock height={200} />
          </div>
        </div>
      )}

      {!loading && result && (
        <>
          {/* Title + simulated badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {result.label}
            </h2>
            <span style={{ color: C.textMuted, fontSize: 12 }}>
              {new Date(result.period.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              {" – "}
              {new Date(result.period.end).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
            {result.isSimulated && (
              <Badge label="SIMULATED" color={C.amber} style={{ fontSize: 11 }} />
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <StatBox
              label="Peak Score"
              value={result.isSimulated ? "—" : result.peakScore.toFixed(1)}
              color={result.peakScore >= 75 ? C.red : result.peakScore >= 50 ? C.amber : C.green}
            />
            <StatBox
              label="Avg Score"
              value={result.isSimulated ? "—" : result.avgScore.toFixed(1)}
              color={result.avgScore >= 50 ? C.amber : C.green}
            />
            <StatBox
              label="Days Above 75"
              value={result.isSimulated ? "—" : String(result.daysAbove75)}
              color={result.daysAbove75 > 10 ? C.red : result.daysAbove75 > 0 ? C.amber : C.green}
            />
            <StatBox
              label="Data Points"
              value={result.isSimulated ? "0" : String(result.scores.length)}
              color={C.textMuted}
            />
          </div>

          {/* Crash Score Timeline */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle info="Crash probability score over the scenario period. Reference line at 75 = Critical threshold.">
              Crash Score Timeline
            </SectionTitle>
            <Card>
              {result.isSimulated || chartData.length === 0 ? (
                <div
                  style={{
                    height: 240,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    color: C.textMuted,
                  }}
                >
                  <span style={{ fontSize: 36 }}>📊</span>
                  <span style={{ fontSize: 14 }}>No historical data for this scenario</span>
                  <span style={{ fontSize: 12 }}>
                    Run <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>pnpm db:backtest</code> to seed historical crash scores
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <defs>
                      <linearGradient id="crashGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: C.textMuted, fontSize: 10 }}
                      axisLine={{ stroke: C.border }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: C.textMuted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ScoreTooltip />} />
                    <ReferenceLine y={75} stroke={C.red} strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Critical", fill: C.red, fontSize: 10, position: "right" }} />
                    <ReferenceLine y={50} stroke={C.amber} strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: "High", fill: C.amber, fontSize: 10, position: "right" }} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={C.red}
                      strokeWidth={2}
                      fill="url(#crashGradient)"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Peak Indicator Heatmap */}
          {peakEntry?.componentScores && Object.keys(peakEntry.componentScores).length > 0 && !result.isSimulated && (
            <div style={{ marginBottom: 28 }}>
              <SectionTitle info="Component scores at the peak crash probability moment during this scenario.">
                Peak Indicator Heatmap
              </SectionTitle>
              <Card>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
                  At peak score ({result.peakScore.toFixed(1)}) on{" "}
                  {peakEntry?.calculatedAt
                    ? new Date(peakEntry.calculatedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
                <IndicatorHeatmap componentScores={peakEntry.componentScores as Record<string, number>} />
              </Card>
            </div>
          )}

          {/* Strategy Performance Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            {/* Strategy Bar Chart */}
            <div>
              <SectionTitle info="Current strategy win rates — data reflects all-time performance, not scenario-specific.">
                Strategy Performance
              </SectionTitle>
              <Card>
                {strategyData.length === 0 ? (
                  <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0" }}>
                    No strategy performance data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={strategyData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: C.textMuted, fontSize: 10 }}
                        axisLine={{ stroke: C.border }}
                        tickLine={false}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: C.textMuted, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Win Rate"]}
                        contentStyle={{
                          background: "#1a2235",
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                        {strategyData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.winRate >= 60 ? C.green : entry.winRate >= 45 ? C.amber : C.red}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Signal Accuracy Table */}
            <div>
              <SectionTitle info="Recent signals with outcome tracking. Win = signal moved in predicted direction.">
                Signal Accuracy
              </SectionTitle>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {signals.length === 0 ? (
                  <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 24px" }}>
                    No signal history available
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Instrument", "Action", "Confidence", "Outcome"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 16px",
                              textAlign: "left",
                              color: C.textMuted,
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {signals.slice(0, 8).map((sig, i) => {
                        const isLong = ["BUY", "LONG"].includes((sig.action ?? "").toUpperCase());
                        const dirColor = isLong ? C.green : C.red;
                        const confidence = sig.confidence ?? 0;
                        const outcome = sig.outcome;
                        const outcomeColor =
                          outcome === "win"
                            ? C.green
                            : outcome === "loss"
                            ? C.red
                            : C.textMuted;
                        const outcomeLabel =
                          outcome === "win"
                            ? "WIN ✓"
                            : outcome === "loss"
                            ? "LOSS ✗"
                            : outcome
                            ? outcome.toUpperCase()
                            : "—";

                        return (
                          <tr
                            key={sig.id}
                            style={{
                              borderBottom: i < signals.length - 1 ? `1px solid ${C.border}` : "none",
                              background: i % 2 === 0 ? "transparent" : "#0f1624",
                            }}
                          >
                            <td style={{ padding: "9px 16px", color: C.textPrimary, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                              {sig.instrument ?? "—"}
                            </td>
                            <td style={{ padding: "9px 16px" }}>
                              <span
                                style={{
                                  color: dirColor,
                                  background: `${dirColor}18`,
                                  border: `1px solid ${dirColor}44`,
                                  padding: "1px 8px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 800,
                                }}
                              >
                                {isLong ? "LONG" : "SHORT"}
                              </span>
                            </td>
                            <td style={{ padding: "9px 16px", color: confidence >= 75 ? C.green : confidence >= 50 ? C.amber : C.red, fontFamily: "monospace", fontSize: 12 }}>
                              {confidence.toFixed(0)}%
                            </td>
                            <td style={{ padding: "9px 16px", color: outcomeColor, fontSize: 11, fontWeight: 600 }}>
                              {outcomeLabel}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
