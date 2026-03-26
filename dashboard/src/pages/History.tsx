import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { getScoreHistory, getRegimeHistory, getSignals, getMacroEvents } from "../api.js";
import {
  C,
  Card,
  SectionTitle,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  REGIME_COLORS,
  getScoreColor,
  useBeginnerMode,
  TH,
  TD,
} from "../context.js";

type MarketKey = "global" | "us" | "eu" | "asia";
type DaysOption = 7 | 30 | 90 | 180;

const MARKET_OPTIONS: { label: string; value: MarketKey; flag: string }[] = [
  { label: "Global", value: "global", flag: "🌐" },
  { label: "US", value: "us", flag: "🇺🇸" },
  { label: "EU", value: "eu", flag: "🇪🇺" },
  { label: "Asia", value: "asia", flag: "🇯🇵" },
];

const DAYS_OPTIONS: DaysOption[] = [7, 30, 90, 180];

const MARKET_COLORS: Record<MarketKey, string> = {
  global: "#6366f1",
  us: "#3b82f6",
  eu: "#8b5cf6",
  asia: "#06b6d4",
};

// Annotated crash events for context
const CRASH_EVENTS: { date: string; label: string; score?: number }[] = [
  { date: "2020-03-16", label: "COVID Crash", score: 96 },
  { date: "2022-06-16", label: "Rate Shock", score: 81 },
  { date: "2023-03-10", label: "SVB Crisis", score: 74 },
];

const OUTCOME_COLORS: Record<string, string> = {
  WIN: C.green,
  LOSS: C.red,
  OPEN: C.amber,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  FOMC: "#3b82f6",
  CPI: "#f59e0b",
  JOBS: "#10b981",
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: C.red,
  MEDIUM: C.amber,
  LOW: C.green,
};

function eventColor(type: string): string {
  return EVENT_TYPE_COLORS[type?.toUpperCase()] ?? "#94a3b8";
}

function ButtonGroup<T extends string | number>({
  options,
  active,
  onSelect,
  labelFn,
}: {
  options: T[];
  active: T;
  onSelect: (v: T) => void;
  labelFn?: (v: T) => string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {options.map((opt) => {
        const isAct = opt === active;
        return (
          <button
            key={String(opt)}
            onClick={() => onSelect(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              border: isAct ? `1px solid ${C.blue}44` : "1px solid transparent",
              background: isAct ? `${C.blue}1a` : "transparent",
              color: isAct ? C.blue : "#64748b",
              fontWeight: isAct ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {labelFn ? labelFn(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value as number;
  const date = payload[0]?.payload?.fullDate;
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
      <div style={{ color: C.textSecondary, marginBottom: 4 }}>{date}</div>
      <div style={{ color: getScoreColor(score), fontWeight: 700, fontSize: 16 }}>
        Score: {score?.toFixed(1)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-Market Comparison Chart
// ---------------------------------------------------------------------------
const MULTI_MARKET_COLORS: Record<MarketKey, string> = {
  global: "#f1f5f9",
  us: "#3b82f6",
  eu: "#f59e0b",
  asia: "#10b981",
};

function MultiMarketTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
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
      <div style={{ color: C.textSecondary, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: p.color, textTransform: "capitalize" }}>{p.dataKey}</span>
          <span style={{ color: p.color, fontWeight: 700, fontFamily: "monospace" }}>
            {p.value?.toFixed(1) ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MultiMarketChart({ days }: { days: DaysOption }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<MarketKey | null>(null);

  useEffect(() => {
    setLoading(true);
    const markets: MarketKey[] = ["global", "us", "eu", "asia"];
    Promise.all(markets.map((m) => getScoreHistory(m, days).catch(() => [])))
      .then(([global, us, eu, asia]) => {
        // Merge by date label
        const map: Record<string, any> = {};
        function insert(arr: any[], key: MarketKey) {
          for (const s of arr) {
            const d = new Date(s.calculatedAt);
            const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!map[label]) map[label] = { time: label };
            map[label][key] = Number(s.crashScore);
          }
        }
        insert(global, "global");
        insert(us, "us");
        insert(eu, "eu");
        insert(asia, "asia");
        const merged = Object.values(map).sort((a, b) => {
          // Sort by parsing the label back — approximate
          return a.time.localeCompare(b.time);
        });
        setData(merged);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ height: 300, background: "#1e293b", borderRadius: 8, opacity: 0.4 }} />;
  if (data.length === 0) return (
    <EmptyState icon="📉" title="No comparison data" subtitle="Historical score data not yet available for all markets." />
  );

  const markets: MarketKey[] = ["global", "us", "eu", "asia"];

  return (
    <Card style={{ padding: "16px 18px" }}>
      {/* Legend with current scores */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
        {markets.map((m) => {
          const last = data[data.length - 1]?.[m];
          const color = MULTI_MARKET_COLORS[m];
          const isHigh = highlighted === m;
          return (
            <button
              key={m}
              onClick={() => setHighlighted(isHigh ? null : m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: isHigh ? `${color}18` : "transparent",
                border: `1px solid ${isHigh ? color + "44" : C.border}`,
                borderRadius: 8,
                padding: "5px 12px",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              <div style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
              <span style={{ color: color, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{m}</span>
              {last != null && (
                <span style={{ color: getScoreColor(last), fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
                  {last.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
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
          <Tooltip content={<MultiMarketTooltip />} />
          <ReferenceLine y={75} stroke="#ef444855" strokeDasharray="5 3" />
          <ReferenceLine y={50} stroke="#f59e0b55" strokeDasharray="5 3" />
          {markets.map((m) => {
            const color = MULTI_MARKET_COLORS[m];
            const dim = highlighted != null && highlighted !== m;
            return (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={color}
                strokeWidth={highlighted === m ? 3 : dim ? 1 : 2}
                dot={false}
                opacity={dim ? 0.25 : 1}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function History() {
  const { beginnerMode } = useBeginnerMode();
  const [activeTab, setActiveTab] = useState<"single" | "comparison">("single");
  const [market, setMarket] = useState<MarketKey>("global");
  const [days, setDays] = useState<DaysOption>(30);

  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [regimeHistory, setRegimeHistory] = useState<any[]>([]);
  const [closedSignals, setClosedSignals] = useState<any[]>([]);
  const [macroEvents, setMacroEvents] = useState<any[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<Set<string>>(new Set(["FOMC", "CPI", "JOBS"]));
  const [searchQuery, setSearchQuery] = useState("");

  const [scoreLoading, setScoreLoading] = useState(true);
  const [regimeLoading, setRegimeLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [regimeError, setRegimeError] = useState<string | null>(null);

  async function loadScores(m: MarketKey, d: DaysOption) {
    setScoreLoading(true);
    try {
      const data = await getScoreHistory(m, d);
      setScoreHistory(Array.isArray(data) ? data : []);
      setScoreError(null);
    } catch (e) {
      setScoreError(String(e));
    } finally {
      setScoreLoading(false);
    }
  }

  async function loadRegimeAndSignals() {
    setRegimeLoading(true);
    try {
      const [regData, sigData] = await Promise.all([
        getRegimeHistory().catch(() => []),
        getSignals(true).catch(() => []),
      ]);
      setRegimeHistory(Array.isArray(regData) ? regData : []);
      setRegimeError(null);
      const closed = Array.isArray(sigData)
        ? sigData.filter((s: any) => s.status?.toLowerCase() !== "open" && s.status?.toLowerCase() !== "active")
        : [];
      setClosedSignals(closed);
    } catch (e) {
      setRegimeError(String(e));
    } finally {
      setRegimeLoading(false);
    }
  }

  useEffect(() => { loadScores(market, days); }, [market, days]);
  useEffect(() => {
    getMacroEvents(days).then(setMacroEvents).catch(() => setMacroEvents([]));
  }, [days]);
  useEffect(() => {
    loadRegimeAndSignals();
    const interval = setInterval(loadRegimeAndSignals, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Build chart data
  const lineColor = MARKET_COLORS[market];
  const chartData = [...scoreHistory]
    .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
    .map((s: any) => {
      const d = new Date(s.calculatedAt);
      return {
        time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleString(),
        score: Number(s.crashScore),
      };
    });

  // Map macro events to chart time strings
  const eventLines = macroEvents
    .map((ev: any) => {
      const evMs = new Date(ev.date).getTime();
      let best: { time: string; fullDate: string; score: number } | null = null;
      let bestDiff = Infinity;
      for (const p of chartData) {
        const diff = Math.abs(new Date(p.fullDate).getTime() - evMs);
        if (diff < bestDiff) { bestDiff = diff; best = p; }
      }
      if (!best || bestDiff > 3 * 24 * 60 * 60 * 1000) return null;
      return { ...ev, xVal: best.time };
    })
    .filter(Boolean) as any[];

  // Today and upcoming 7 days for highlighting
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  // Filter signals by search
  const filteredSignals = closedSignals.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.instrument?.toLowerCase().includes(q) ||
      s.strategy?.toLowerCase().includes(q) ||
      s.action?.toLowerCase().includes(q)
    );
  });

  // Win rate
  const wins = closedSignals.filter((s) => s.outcome?.toUpperCase() === "WIN").length;
  const losses = closedSignals.filter((s) => s.outcome?.toUpperCase() === "LOSS").length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Historical Analysis
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Crash scores, regime changes, and signal performance over time
        </p>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 3, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, width: "fit-content" }}>
        {[
          { id: "single", label: "Score History" },
          { id: "comparison", label: "Market Comparison" },
        ].map((tab) => {
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "single" | "comparison")}
              style={{
                padding: "7px 18px",
                borderRadius: 7,
                border: isAct ? `1px solid ${C.blue}44` : "1px solid transparent",
                background: isAct ? `${C.blue}1a` : "transparent",
                color: isAct ? C.blue : "#64748b",
                fontWeight: isAct ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Selectors */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
        {activeTab === "single" && (
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Market
            </div>
            <ButtonGroup
              options={MARKET_OPTIONS.map((m) => m.value)}
              active={market}
              onSelect={setMarket}
              labelFn={(v) => {
                const m = MARKET_OPTIONS.find((mo) => mo.value === v);
                return `${m?.flag} ${m?.label}`;
              }}
            />
          </div>
        )}
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Period
          </div>
          <ButtonGroup
            options={DAYS_OPTIONS}
            active={days}
            onSelect={setDays}
            labelFn={(v) => `${v}d`}
          />
        </div>
      </div>

      {/* Market Comparison Tab */}
      {activeTab === "comparison" && (
        <div style={{ marginBottom: 32 }}>
          <SectionTitle info="Crash probability scores for all 4 markets over time. Click a legend item to highlight that market's line.">
            Multi-Market Comparison — {days}d
          </SectionTitle>
          <MultiMarketChart days={days} />
          {beginnerMode && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary }}>
              📚 Each line shows a different region's crash probability score. When all lines rise together, a global risk event may be unfolding. When only one rises, the risk is regional.
            </div>
          )}
        </div>
      )}

      {/* Section 1: Score History (single market tab) */}
      {activeTab === "single" && (<>
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>
          Crash Score History — {MARKET_OPTIONS.find((m) => m.value === market)?.label}
        </SectionTitle>

        {scoreError && <ErrorBanner message={scoreError} onRetry={() => loadScores(market, days)} />}

        {scoreLoading ? (
          <SkeletonBlock height={300} />
        ) : chartData.length === 0 ? (
          <EmptyState
            icon="📉"
            title="No historical data"
            subtitle="No score history available for this market and period."
          />
        ) : (
          <Card style={{ padding: "16px 18px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
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
                  stroke="#ef444888"
                  strokeDasharray="5 3"
                  label={{ value: "Critical (75)", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#f59e0b88"
                  strokeDasharray="5 3"
                  label={{ value: "High (50)", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" }}
                />
                {eventLines.map((ev: any, i: number) => {
                  const color = eventColor(ev.type);
                  return (
                    <ReferenceLine
                      key={i}
                      x={ev.xVal}
                      stroke={color + "99"}
                      strokeDasharray="4 3"
                      label={{ value: ev.type?.toUpperCase() ?? "", fill: color, fontSize: 9, position: "insideTopLeft" }}
                    />
                  );
                })}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#histGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                  name="Crash Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {beginnerMode && !scoreLoading && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: `${C.blue}0d`,
              border: `1px solid ${C.blue}22`,
              borderRadius: 8,
              fontSize: 12,
              color: C.textSecondary,
            }}
          >
            📚 The dashed lines mark danger zones. Above 50 = elevated risk. Above 75 = critical — historically
            preceded by sharp market drops within 1-3 months.
          </div>
        )}
      </div>

      </>)}

      {/* Section 2: Macro Event Calendar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>Macro Event Calendar</SectionTitle>
          {/* Filter checkboxes */}
          <div style={{ display: "flex", gap: 8 }}>
            {["FOMC", "CPI", "JOBS"].map((t) => {
              const active = eventTypeFilter.has(t);
              const color = eventColor(t);
              return (
                <button
                  key={t}
                  onClick={() => setEventTypeFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t); else next.add(t);
                    return next;
                  })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${active ? color + "88" : C.border}`,
                    background: active ? color + "18" : "transparent",
                    color: active ? color : C.textMuted,
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {macroEvents.length === 0 ? (
          <EmptyState icon="📅" title="No macro events" subtitle="Macro events will appear here when available." />
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={TH}>Date</th>
                    <th style={TH}>Event</th>
                    <th style={TH}>Type</th>
                    <th style={TH}>Impact</th>
                    <th style={TH}>Days Until</th>
                  </tr>
                </thead>
                <tbody>
                  {macroEvents
                    .filter((ev: any) => eventTypeFilter.has(ev.type?.toUpperCase()))
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((ev: any, i: number) => {
                      const evMs = new Date(ev.date).getTime();
                      const diffMs = evMs - now;
                      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
                      const isUpcoming = diffMs >= 0 && diffMs <= week;
                      const isPast = diffMs < 0;
                      const color = eventColor(ev.type);
                      const impactKey = (ev.impact ?? "").toUpperCase();
                      const impactColor = IMPACT_COLORS[impactKey] ?? C.textMuted;
                      return (
                        <tr
                          key={ev.id ?? i}
                          style={{ background: isUpcoming ? `${C.blue}08` : undefined }}
                        >
                          <td style={{ ...TD, color: isUpcoming ? C.blue : C.textMuted, fontWeight: isUpcoming ? 600 : 400 }}>
                            {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td style={{ ...TD, color: C.textPrimary }}>
                            {ev.title ?? ev.name ?? ev.type}
                          </td>
                          <td style={TD}>
                            <span
                              style={{
                                color,
                                background: color + "18",
                                border: `1px solid ${color}44`,
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {ev.type?.toUpperCase()}
                            </span>
                          </td>
                          <td style={TD}>
                            <span
                              style={{
                                color: impactColor,
                                background: impactColor + "18",
                                border: `1px solid ${impactColor}44`,
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {ev.impact ?? "—"}
                            </span>
                          </td>
                          <td style={{ ...TD, fontVariantNumeric: "tabular-nums", color: isPast ? C.textMuted : isUpcoming ? C.blue : C.textSecondary }}>
                            {isPast
                              ? `${Math.abs(diffDays)}d ago`
                              : diffDays === 0
                              ? "Today"
                              : `${diffDays}d`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Section 3: Regime Timeline */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Regime Change Timeline</SectionTitle>

        {regimeError && <ErrorBanner message={regimeError} onRetry={loadRegimeAndSignals} />}

        {regimeLoading ? (
          <SkeletonBlock height={160} />
        ) : regimeHistory.length === 0 ? (
          <EmptyState icon="📅" title="No regime changes recorded" subtitle="Regime change history will appear as market conditions evolve." />
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {regimeHistory.map((event: any, i: number) => {
              const fromKey = event.from?.toUpperCase();
              const toKey = event.to?.toUpperCase();
              const fromColor = REGIME_COLORS[fromKey] ?? C.textMuted;
              const toColor = REGIME_COLORS[toKey] ?? C.textMuted;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 20px",
                    borderBottom: i < regimeHistory.length - 1 ? `1px solid ${C.border}` : undefined,
                  }}
                >
                  {/* Timeline marker */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: toColor, boxShadow: `0 0 6px ${toColor}66` }} />
                    {i < regimeHistory.length - 1 && (
                      <div style={{ width: 2, height: 20, background: `${C.border}`, marginTop: 4 }} />
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ color: C.textMuted, fontSize: 12, width: 90, flexShrink: 0 }}>
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                      : "—"}
                  </div>

                  {/* Transition */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <Badge label={event.from ?? "—"} color={fromColor} />
                    <span style={{ color: C.textMuted, fontSize: 14 }}>→</span>
                    <Badge label={event.to ?? "—"} color={toColor} />
                  </div>

                  {/* Market */}
                  {event.market && (
                    <div style={{ color: C.textMuted, fontSize: 12, textTransform: "uppercase", flexShrink: 0 }}>
                      {event.market}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {/* Section 4: Signal Performance */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }}>
              Past Signals Performance
            </h2>
            {winRate != null && (
              <div
                style={{
                  background: winRate >= 50 ? `${C.green}1a` : `${C.red}1a`,
                  border: `1px solid ${winRate >= 50 ? C.green : C.red}44`,
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontSize: 12,
                  color: winRate >= 50 ? C.green : C.red,
                  fontWeight: 600,
                }}
              >
                Win Rate: {winRate.toFixed(1)}% ({wins}W / {losses}L)
              </div>
            )}
          </div>
          {closedSignals.length > 0 && (
            <input
              type="text"
              placeholder="Search signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "7px 12px",
                color: C.textPrimary,
                fontSize: 12,
                outline: "none",
                width: 180,
              }}
            />
          )}
        </div>

        {closedSignals.length === 0 ? (
          <EmptyState icon="📊" title="No closed signals" subtitle="Completed signal performance will appear here." />
        ) : filteredSignals.length === 0 ? (
          <EmptyState icon="🔍" title="No matching signals" subtitle="Try a different search term." />
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={TH}>Date</th>
                    <th style={TH}>Instrument</th>
                    <th style={TH}>Action</th>
                    <th style={TH}>Strategy</th>
                    <th style={TH}>Target</th>
                    <th style={TH}>Result</th>
                    <th style={TH}>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals.map((sig: any, i: number) => {
                    const outcome = (sig.outcome ?? sig.status ?? "OPEN").toUpperCase();
                    const outcomeColor = OUTCOME_COLORS[outcome] ?? C.textMuted;
                    const ac = sig.action?.toUpperCase();
                    const actionColor = ac === "BUY" || ac === "LONG" ? C.green : ac === "SHORT" ? C.red : "#f97316";
                    return (
                      <tr key={sig.id ?? i}>
                        <td style={{ ...TD, color: C.textMuted }}>
                          {sig.createdAt ? new Date(sig.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ ...TD, color: C.textPrimary, fontWeight: 700 }}>
                          {sig.instrument ?? "—"}
                        </td>
                        <td style={TD}>
                          <span
                            style={{
                              color: actionColor,
                              background: `${actionColor}1a`,
                              border: `1px solid ${actionColor}44`,
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {ac ?? "—"}
                          </span>
                        </td>
                        <td style={{ ...TD, color: C.textSecondary, fontSize: 12 }}>{sig.strategy ?? "—"}</td>
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                          {sig.target != null ? `$${Number(sig.target).toFixed(2)}` : "—"}
                        </td>
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                          {sig.actualResult != null
                            ? `$${Number(sig.actualResult).toFixed(2)}`
                            : sig.closePrice != null
                            ? `$${Number(sig.closePrice).toFixed(2)}`
                            : "—"}
                        </td>
                        <td style={TD}>
                          <Badge label={outcome} color={outcomeColor} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
