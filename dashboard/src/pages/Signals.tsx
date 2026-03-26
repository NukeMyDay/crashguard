import { useEffect, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getSignals, getAlerts, getSignalAccuracy } from "../api.js";
import {
  C,
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  useExpertise,
  SectionTitle,
  TH,
  TD,
  InfoIcon,
} from "../context.js";

interface Signal {
  id: string;
  instrument: string;
  action: string;
  strategy: string;
  strategyType?: string;
  confidence?: number;
  strength?: number;
  positionSize?: number;
  entry?: number;
  entryPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  target?: number;
  rrRatio?: number;
  timeframe?: string;
  createdAt?: string;
  generatedAt?: string;
  expiresAt?: string;
  reason?: string;
  rationale?: string;
  status?: string;
  relatedIndicators?: string[];
  riskFactors?: string[];
}

type DirectionFilter = "all" | "long" | "short";
type SortField = "strength" | "confidence" | "recency";

function getDirectionLabel(action: string): { label: string; color: string } {
  const a = action?.toUpperCase() ?? "";
  if (a === "BUY" || a === "LONG") return { label: "LONG", color: C.green };
  if (a === "SHORT" || a === "SELL") return { label: "SHORT", color: C.red };
  return { label: a, color: C.textMuted };
}

function getAge(ts?: string): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getExpiry(ts?: string): { label: string; color: string } {
  if (!ts) return { label: "—", color: C.textMuted };
  const diff = new Date(ts).getTime() - Date.now();
  if (diff < 0) return { label: "Expired", color: C.red };
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return { label: `${mins}m`, color: C.amber };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h`, color: C.textSecondary };
  return { label: `${Math.floor(hrs / 24)}d`, color: C.textMuted };
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  let color = C.green;
  if (pct < 40) color = C.red;
  else if (pct < 60) color = C.amber;
  else if (pct < 75) color = "#3b82f6";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Confidence</span>
        <span style={{ color, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{pct.toFixed(0)}</span>
      </div>
      <div style={{ width: "100%", height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function PnLBadge({ signal }: { signal: Signal }) {
  const entry = signal.entry ?? signal.entryPrice;
  const current = signal.currentPrice;
  if (!entry || !current) return null;
  const isShort = (signal.action?.toUpperCase() === "SHORT" || signal.action?.toUpperCase() === "SELL");
  const pnlPct = isShort ? ((entry - current) / entry) * 100 : ((current - entry) / entry) * 100;
  const color = pnlPct >= 0 ? C.green : C.red;
  return (
    <span style={{ color, fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>
      {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
    </span>
  );
}

function StatusDot({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "active";
  let color = C.blue;
  let pulse = false;
  if (s === "triggered" || s === "filled") { color = C.green; pulse = true; }
  else if (s === "expired" || s === "cancelled") color = C.textMuted;
  else if (s === "active") { color = C.green; pulse = true; }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0,
          boxShadow: pulse ? `0 0 6px ${color}88` : "none",
        }}
      />
      <span style={{ color: C.textMuted, fontSize: 11, textTransform: "capitalize" }}>{s}</span>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const { isBeginner, isProfessional } = useExpertise();
  const direction = getDirectionLabel(signal.action ?? "");
  const entry = signal.entry ?? signal.entryPrice;
  const generated = signal.createdAt ?? signal.generatedAt;
  const expiry = getExpiry(signal.expiresAt);
  const confidence = signal.confidence ?? signal.strength ?? 0;
  const riskFactors: string[] = signal.riskFactors ?? signal.relatedIndicators ?? [];
  const isExpired = signal.status?.toLowerCase() === "expired";

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${expanded ? C.blue + "44" : C.border}`,
        borderLeft: `3px solid ${direction.color}`,
        borderRadius: 10,
        overflow: "hidden",
        opacity: isExpired ? 0.55 : 1,
        transition: "border-color 0.15s",
      }}
    >
      {/* Main row — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "14px 18px", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "12px 20px", alignItems: "start" }}
      >
        {/* Left: direction badge + instrument */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 110 }}>
          <span
            style={{
              color: direction.color,
              background: `${direction.color}1a`,
              border: `1px solid ${direction.color}44`,
              padding: "3px 10px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textAlign: "center",
              display: "inline-block",
            }}
          >
            {direction.label}
          </span>
          <span style={{ color: C.textPrimary, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>
            {signal.instrument ?? "—"}
          </span>
          <StatusDot status={signal.status} />
        </div>

        {/* Center: price levels + strategy + confidence */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Price trio */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {entry != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>ENTRY</div>
                <div style={{ color: C.textPrimary, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                  ${Number(entry).toFixed(2)}
                </div>
              </div>
            )}
            {signal.stopLoss != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>STOP</div>
                <div style={{ color: C.red, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                  ${Number(signal.stopLoss).toFixed(2)}
                </div>
              </div>
            )}
            {signal.target != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>TARGET</div>
                <div style={{ color: C.green, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                  ${Number(signal.target).toFixed(2)}
                </div>
              </div>
            )}
            {signal.rrRatio != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>R/R</div>
                <div
                  style={{
                    color: "#6366f1",
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#6366f122",
                    border: "1px solid #6366f144",
                    padding: "1px 6px",
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  {Number(signal.rrRatio).toFixed(1)}:1
                </div>
              </div>
            )}
            {signal.currentPrice != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>CURRENT</div>
                <div style={{ color: C.textSecondary, fontFamily: "monospace", fontSize: 13 }}>
                  ${Number(signal.currentPrice).toFixed(2)}
                </div>
              </div>
            )}
            {signal.currentPrice != null && entry != null && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>P&L</div>
                <PnLBadge signal={signal} />
              </div>
            )}
          </div>

          {/* Strategy */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {signal.strategy && (
              <span style={{ color: C.textMuted, fontSize: 12 }}>{signal.strategy}</span>
            )}
            {signal.strategyType && (
              <Badge label={signal.strategyType} color="#6366f1" style={{ fontSize: 10 }} />
            )}
            {signal.timeframe && (
              <span style={{ color: "#2a3a50", fontSize: 10, fontFamily: "monospace" }}>{signal.timeframe}</span>
            )}
          </div>

          {/* Confidence meter */}
          <div style={{ maxWidth: 200 }}>
            <ConfidenceMeter value={confidence} />
          </div>

          {/* Position size */}
          {signal.positionSize != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: C.textMuted, fontSize: 11 }}>Position size:</span>
              <span
                style={{
                  color: C.amber,
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  background: `${C.amber}18`,
                  border: `1px solid ${C.amber}44`,
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {Number(signal.positionSize).toFixed(1)}%
              </span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>of portfolio</span>
            </div>
          )}
        </div>

        {/* Right: metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 80 }}>
          <span style={{ color: C.textMuted, fontSize: 11 }}>{getAge(generated)}</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.textMuted, fontSize: 10 }}>Expires</div>
            <div style={{ color: expiry.color, fontSize: 11, fontFamily: "monospace" }}>{expiry.label}</div>
          </div>
          <span
            style={{
              color: C.textMuted, fontSize: 11,
              background: "#1e293b",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Risk factor pills — always shown if available */}
      {riskFactors.length > 0 && (
        <div style={{ padding: "0 18px 12px", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {riskFactors.map((rf) => (
            <span
              key={rf}
              style={{
                background: `${C.amber}18`,
                border: `1px solid ${C.amber}44`,
                color: C.amber,
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              ⚠ {rf}
            </span>
          ))}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div
          style={{
            padding: "14px 18px",
            borderTop: `1px solid ${C.border}`,
            background: "#090f1a",
          }}
        >
          {/* Rationale */}
          {(signal.reason ?? signal.rationale) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Signal Rationale
              </div>
              <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                {signal.reason ?? signal.rationale}
              </p>
            </div>
          )}

          {isBeginner && (
            <div
              style={{
                padding: "10px 14px",
                background: `${C.blue}0d`,
                border: `1px solid ${C.blue}22`,
                borderRadius: 8,
                fontSize: 12,
                color: C.textSecondary,
              }}
            >
              📚 <strong>Beginner tip:</strong> R/R ratio = Risk/Reward. A 2.5:1 means you risk $1 to potentially earn $2.50. Confidence (0–100) reflects how strongly the strategy conditions are met. Higher is better.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function filterAndSortSignals(
  signals: Signal[],
  direction: DirectionFilter,
  strategyType: string,
  minConfidence: number,
  sortField: SortField
): Signal[] {
  let result = [...signals];

  if (direction === "long") result = result.filter((s) => ["BUY", "LONG"].includes(s.action?.toUpperCase() ?? ""));
  if (direction === "short") result = result.filter((s) => ["SELL", "SHORT"].includes(s.action?.toUpperCase() ?? ""));

  if (strategyType !== "all") {
    result = result.filter((s) => (s.strategyType ?? s.strategy ?? "").toUpperCase() === strategyType.toUpperCase());
  }

  result = result.filter((s) => (s.confidence ?? s.strength ?? 0) >= minConfidence);

  result.sort((a, b) => {
    if (sortField === "strength") return (b.strength ?? b.confidence ?? 0) - (a.strength ?? a.confidence ?? 0);
    if (sortField === "confidence") return (b.confidence ?? b.strength ?? 0) - (a.confidence ?? a.strength ?? 0);
    if (sortField === "recency") {
      const ta = new Date(a.createdAt ?? a.generatedAt ?? 0).getTime();
      const tb = new Date(b.createdAt ?? b.generatedAt ?? 0).getTime();
      return tb - ta;
    }
    return 0;
  });

  return result;
}

// Professional mode: sortable table view of signals
function ProSignalsTable({ signals }: { signals: Signal[] }) {
  const [sortCol, setSortCol] = useState<"confidence" | "instrument" | "action" | "rrRatio" | "expiry">("confidence");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc((v) => !v);
    else { setSortCol(col); setSortAsc(false); }
  }

  const sorted = [...signals].sort((a, b) => {
    let av: any, bv: any;
    if (sortCol === "confidence") { av = a.confidence ?? a.strength ?? 0; bv = b.confidence ?? b.strength ?? 0; }
    else if (sortCol === "instrument") { av = a.instrument ?? ""; bv = b.instrument ?? ""; }
    else if (sortCol === "action") { av = a.action ?? ""; bv = b.action ?? ""; }
    else if (sortCol === "rrRatio") { av = a.rrRatio ?? 0; bv = b.rrRatio ?? 0; }
    else { av = new Date(a.expiresAt ?? 0).getTime(); bv = new Date(b.expiresAt ?? 0).getTime(); }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  function SortTH({ col, children }: { col: typeof sortCol; children: React.ReactNode }) {
    const active = sortCol === col;
    return (
      <th style={{ ...TH, cursor: "pointer", userSelect: "none", padding: "7px 10px", fontSize: 10 }} onClick={() => handleSort(col)}>
        <span style={{ color: active ? C.blue : undefined }}>{children}</span>
        {active && <span style={{ marginLeft: 3, color: C.blue }}>{sortAsc ? "↑" : "↓"}</span>}
      </th>
    );
  }

  const compactTD: React.CSSProperties = { ...TD, padding: "6px 10px", fontSize: 12 };

  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <SortTH col="instrument">Ticker</SortTH>
              <SortTH col="action">Dir.</SortTH>
              <th style={{ ...TH, padding: "7px 10px", fontSize: 10 }}>Entry</th>
              <th style={{ ...TH, padding: "7px 10px", fontSize: 10 }}>Stop</th>
              <th style={{ ...TH, padding: "7px 10px", fontSize: 10 }}>Target</th>
              <SortTH col="rrRatio">R/R</SortTH>
              <SortTH col="confidence">Conf.</SortTH>
              <SortTH col="expiry">Expires</SortTH>
              <th style={{ ...TH, padding: "7px 10px", fontSize: 10 }}>Strategy</th>
              <th style={{ ...TH, padding: "7px 10px", fontSize: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sig) => {
              const dir = getDirectionLabel(sig.action ?? "");
              const entry = sig.entry ?? sig.entryPrice;
              const conf = sig.confidence ?? sig.strength ?? 0;
              const expiry = getExpiry(sig.expiresAt);
              const confColor = conf >= 75 ? C.green : conf >= 50 ? C.amber : C.red;
              const isExpired = sig.status?.toLowerCase() === "expired";
              return (
                <tr key={sig.id} style={{ opacity: isExpired ? 0.5 : 1 }}>
                  <td style={{ ...compactTD, color: C.textPrimary, fontWeight: 700, fontFamily: "monospace" }}>{sig.instrument ?? "—"}</td>
                  <td style={compactTD}>
                    <span style={{ color: dir.color, background: `${dir.color}1a`, border: `1px solid ${dir.color}44`, padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 800 }}>
                      {dir.label}
                    </span>
                  </td>
                  <td style={{ ...compactTD, fontFamily: "monospace" }}>{entry != null ? `$${Number(entry).toFixed(2)}` : "—"}</td>
                  <td style={{ ...compactTD, color: C.red, fontFamily: "monospace" }}>{sig.stopLoss != null ? `$${Number(sig.stopLoss).toFixed(2)}` : "—"}</td>
                  <td style={{ ...compactTD, color: C.green, fontFamily: "monospace" }}>{sig.target != null ? `$${Number(sig.target).toFixed(2)}` : "—"}</td>
                  <td style={{ ...compactTD, color: "#6366f1", fontFamily: "monospace", fontWeight: 700 }}>{sig.rrRatio != null ? `${Number(sig.rrRatio).toFixed(2)}:1` : "—"}</td>
                  <td style={{ ...compactTD, color: confColor, fontFamily: "monospace", fontWeight: 700 }}>{conf.toFixed(1)}</td>
                  <td style={{ ...compactTD, color: expiry.color, fontFamily: "monospace" }}>{expiry.label}</td>
                  <td style={{ ...compactTD, color: C.textMuted, fontSize: 11 }}>{sig.strategyType ?? sig.strategy ?? "—"}</td>
                  <td style={{ ...compactTD, color: C.textMuted, fontSize: 11, textTransform: "capitalize" }}>{sig.status ?? "active"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert History
// ---------------------------------------------------------------------------
type AlertMarketFilter = "all" | "global" | "us" | "eu" | "asia";
type AlertSeverityFilter = "all" | "warning" | "critical" | "extreme";

function AlertHistory() {
  const { isBeginner } = useExpertise();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketFilter, setMarketFilter] = useState<AlertMarketFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>("all");

  async function load() {
    try {
      const data = await getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function acknowledge(id: string) {
    try {
      await fetch(`/v1/alerts/${id}/acknowledge`, { method: "PATCH" });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledgedAt: new Date().toISOString() } : a));
    } catch {
      // best-effort
    }
  }

  const filtered = alerts.filter((a) => {
    if (marketFilter !== "all" && a.market !== marketFilter) return false;
    if (severityFilter !== "all" && (a.severity ?? "").toLowerCase() !== severityFilter) return false;
    return true;
  });

  const severityColor = (sev: string) => {
    const s = sev?.toLowerCase();
    if (s === "extreme") return "#7f1d1d";
    if (s === "critical") return C.red;
    return C.amber;
  };

  const severityBg = (sev: string) => {
    const s = sev?.toLowerCase();
    if (s === "extreme") return "#7f1d1d33";
    if (s === "critical") return `${C.red}18`;
    return `${C.amber}18`;
  };

  function formatTime(ts: string) {
    if (!ts) return "—";
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const MARKET_OPTS: AlertMarketFilter[] = ["all", "global", "us", "eu", "asia"];
  const SEV_OPTS: AlertSeverityFilter[] = ["all", "warning", "critical", "extreme"];

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }}>Alert History</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Market filter */}
          <div style={{ display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
            {MARKET_OPTS.map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: marketFilter === m ? C.blue : "transparent",
                  color: marketFilter === m ? "#fff" : C.textMuted,
                  fontSize: 11,
                  fontWeight: marketFilter === m ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {m === "all" ? "All Markets" : m.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Severity filter */}
          <div style={{ display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
            {SEV_OPTS.map((s) => {
              const color = s === "all" ? C.textMuted : severityColor(s);
              const isAct = severityFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: isAct ? (s === "all" ? C.blue : color) : "transparent",
                    color: isAct ? "#fff" : s === "all" ? C.textMuted : color,
                    fontSize: 11,
                    fontWeight: isAct ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={72} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts in this period" subtitle="Alerts appear when crash scores cross Warning (75) or Critical (90) thresholds." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((alert) => {
            const sev = alert.severity ?? "warning";
            const color = severityColor(sev);
            const bg = severityBg(sev);
            const isExtreme = sev.toLowerCase() === "extreme";
            const isAcked = !!alert.acknowledgedAt;
            return (
              <Card
                key={alert.id}
                style={{
                  padding: "12px 16px",
                  borderLeft: `3px solid ${color}`,
                  background: bg,
                  opacity: isAcked ? 0.6 : 1,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Severity badge */}
                  <span
                    style={{
                      color,
                      background: `${color}22`,
                      border: `1px solid ${color}55`,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      flexShrink: 0,
                      animation: isExtreme && !isAcked ? "pulse 2s infinite" : undefined,
                    }}
                  >
                    {sev}
                  </span>

                  {/* Market */}
                  <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", flexShrink: 0 }}>
                    {alert.market ?? "—"}
                  </span>

                  {/* Message */}
                  <div style={{ flex: 1, color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
                    {alert.message ?? "Alert triggered"}
                  </div>

                  {/* Score */}
                  {alert.crashScore != null && (
                    <span style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {Number(alert.crashScore).toFixed(1)}
                    </span>
                  )}

                  {/* Time */}
                  <span style={{ color: C.textMuted, fontSize: 11, flexShrink: 0 }}>
                    {formatTime(alert.triggeredAt ?? alert.createdAt)}
                  </span>

                  {/* Acknowledge */}
                  {!isAcked && (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 5,
                        border: `1px solid ${C.border}`,
                        background: "transparent",
                        color: C.textMuted,
                        fontSize: 11,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Ack
                    </button>
                  )}
                  {isAcked && (
                    <span style={{ color: C.textMuted, fontSize: 10, flexShrink: 0 }}>✓ acked</span>
                  )}
                </div>

                {isBeginner && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted }}>
                    {sev === "warning" && "⚠ Warning: Crash score crossed 75. Monitor positions."}
                    {sev === "critical" && "🚨 Critical: Crash score crossed 90. High risk of drawdown."}
                    {sev === "extreme" && "‼️ Extreme: Market in extreme stress. Consider defensive positioning."}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 10 }}>
        {filtered.length} of {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accuracy Report tab
// ---------------------------------------------------------------------------

interface AccuracyRow {
  strategy: string;
  signals: number;
  targetHitRate: number;
  avgAccuracy: number;
  avgMfe: number;
  avgMae: number;
}

interface AccuracyData {
  summary?: {
    targetHitRate?: number;
    avgAccuracy?: number;
    avgMfe?: number;
    totalSignals?: number;
  };
  byStrategy?: AccuracyRow[];
  calibration?: { confidence: number; accuracy: number }[];
}

function hitRateColor(rate: number): string {
  if (rate > 50) return C.green;
  if (rate >= 35) return "#f59e0b";
  return C.red;
}

function AccuracyReport() {
  const { isBeginner, isProfessional } = useExpertise();
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSignalAccuracy()
      .then((d: AccuracyData) => { setData(d); setError(null); })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonBlock height={300} />;
  if (error) return <ErrorBanner message={`Failed to load accuracy data: ${error}`} />;

  const summary = data?.summary ?? {};
  const strategies: AccuracyRow[] = data?.byStrategy ?? [];
  const calibPts = (data?.calibration ?? []).map((p) => ({ x: p.confidence, y: p.accuracy }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isBeginner && (
        <div style={{ padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary }}>
          📚 <strong>Target hit rate</strong> shows how often our predicted price levels were actually reached. Higher is better.
        </div>
      )}

      {/* Summary bar */}
      <Card style={{ display: "flex", gap: 32, flexWrap: "wrap", padding: "16px 20px" }}>
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Target Hit Rate</div>
          <div style={{ color: summary.targetHitRate != null ? hitRateColor(summary.targetHitRate * 100) : C.textPrimary, fontSize: 22, fontWeight: 700 }}>
            {summary.targetHitRate != null ? `${(summary.targetHitRate * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Avg Target Accuracy</div>
          <div style={{ color: C.textPrimary, fontSize: 22, fontWeight: 700 }}>
            {summary.avgAccuracy != null ? `${(summary.avgAccuracy * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Avg MFE</div>
          <div style={{ color: C.green, fontSize: 22, fontWeight: 700 }}>
            {summary.avgMfe != null ? `+${(summary.avgMfe * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Signals Tracked</div>
          <div style={{ color: C.textPrimary, fontSize: 22, fontWeight: 700 }}>
            {summary.totalSignals ?? "—"}
          </div>
        </div>
      </Card>

      {/* Strategy breakdown table */}
      {strategies.length > 0 && (
        <div>
          <SectionTitle>Strategy Breakdown</SectionTitle>
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1e293b" }}>
                    <th style={TH}>Strategy</th>
                    <th style={TH}>Signals</th>
                    <th style={TH}>Target Hit Rate</th>
                    <th style={TH}>Avg Accuracy</th>
                    {isProfessional && <th style={TH}>Avg MFE</th>}
                    {isProfessional && <th style={TH}>Avg MAE</th>}
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((row, i) => {
                    const hitPct = row.targetHitRate * 100;
                    const color = hitRateColor(hitPct);
                    return (
                      <tr key={row.strategy} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                        <td style={{ ...TD, color: C.textPrimary, fontWeight: 600 }}>{row.strategy}</td>
                        <td style={{ ...TD, color: C.textMuted }}>{row.signals}</td>
                        <td style={TD}>
                          <span style={{ color, fontWeight: 700 }}>{hitPct.toFixed(0)}%</span>
                          <span style={{ marginLeft: 6, fontSize: 10, color: color === C.green ? "#166534" : color === C.red ? "#7f1d1d" : "#78350f", background: `${color}22`, padding: "1px 6px", borderRadius: 4, border: `1px solid ${color}44` }}>
                            {hitPct > 50 ? "Good" : hitPct >= 35 ? "Fair" : "Poor"}
                          </span>
                        </td>
                        <td style={{ ...TD, color: C.textSecondary }}>{(row.avgAccuracy * 100).toFixed(0)}%</td>
                        {isProfessional && <td style={{ ...TD, color: C.green }}>+{(row.avgMfe * 100).toFixed(1)}%</td>}
                        {isProfessional && <td style={{ ...TD, color: C.red }}>{(row.avgMae * 100).toFixed(1)}%</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Calibration scatter plot */}
      {calibPts.length > 0 && (
        <div>
          <SectionTitle info="A well-calibrated system shows dots along the diagonal — stated confidence matches actual accuracy.">
            Calibration Chart
          </SectionTitle>
          <Card>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2436" />
                <XAxis
                  type="number" dataKey="x" name="Stated Confidence" domain={[0, 100]}
                  tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                  label={{ value: "Stated Confidence (%)", position: "insideBottom", offset: -12, fill: C.textMuted, fontSize: 11 }}
                />
                <YAxis
                  type="number" dataKey="y" name="Actual Accuracy" domain={[0, 100]}
                  tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                  label={{ value: "Actual Accuracy (%)", angle: -90, position: "insideLeft", offset: 16, fill: C.textMuted, fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ background: "#1a2332", border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 }}
                  formatter={(val: any, name: string) => [`${Number(val).toFixed(1)}%`, name]}
                />
                {/* Perfect calibration diagonal */}
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#334155" strokeDasharray="6 3" label={{ value: "Perfect", fill: "#334155", fontSize: 10 }} />
                <Scatter name="Signals" data={calibPts} fill={C.blue} opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
            <p style={{ color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" }}>
              Dots on the diagonal line = perfectly calibrated confidence scores
            </p>
          </Card>
        </div>
      )}

      {strategies.length === 0 && calibPts.length === 0 && (
        <EmptyState icon="📊" title="No accuracy data yet" subtitle="Accuracy data is collected as signals expire and are evaluated against outcomes." />
      )}
    </div>
  );
}

type SignalsPageTab = "signals" | "accuracy";

export function Signals() {
  const { isBeginner, isProfessional } = useExpertise();
  const [pageTab, setPageTab] = useState<SignalsPageTab>("signals");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [strategyType, setStrategyType] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortField, setSortField] = useState<SortField>("recency");

  async function load() {
    try {
      const data = await getSignals();
      setSignals(Array.isArray(data) ? data : []);
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

  // Derive strategy types for filter dropdown
  const strategyTypes = Array.from(new Set(signals.map((s) => s.strategyType ?? s.strategy).filter(Boolean)));

  const filtered = filterAndSortSignals(signals, direction, strategyType, minConfidence, sortField);
  const activeCount = signals.filter((s) => !["expired", "closed", "cancelled"].includes(s.status?.toLowerCase() ?? "")).length;
  const longCount = signals.filter((s) => ["BUY", "LONG"].includes(s.action?.toUpperCase() ?? "")).length;
  const shortCount = signals.filter((s) => ["SELL", "SHORT"].includes(s.action?.toUpperCase() ?? "")).length;

  const DIRECTION_TABS: { id: DirectionFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: signals.length },
    { id: "long", label: "Long ↑", count: longCount },
    { id: "short", label: "Short ↓", count: shortCount },
  ];

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Trading Signals
          </h1>
          <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
            {activeCount} active · {signals.length} total · auto-refreshes every 60s
          </p>
        </div>
        {/* Page-level tab switcher */}
        <div style={{ display: "flex", gap: 4, background: "#0f172a", border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
          {(["signals", "accuracy"] as SignalsPageTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              style={{
                padding: "7px 18px",
                borderRadius: 7,
                border: pageTab === t ? `1px solid ${C.blue}44` : "1px solid transparent",
                background: pageTab === t ? `${C.blue}18` : "transparent",
                color: pageTab === t ? C.blue : C.textMuted,
                fontWeight: pageTab === t ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                textTransform: "capitalize",
              }}
            >
              {t === "signals" ? "Active Signals" : "Accuracy Report"}
            </button>
          ))}
        </div>
      </div>

      {pageTab === "accuracy" && <AccuracyReport />}

      {pageTab === "signals" && (<>

      {error && <ErrorBanner message={`Failed to load signals: ${error}`} onRetry={load} />}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {/* Direction tabs */}
        <div style={{ display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
          {DIRECTION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDirection(tab.id)}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                background: direction === tab.id ? C.blue : "transparent",
                color: direction === tab.id ? "#fff" : C.textMuted,
                fontWeight: direction === tab.id ? 600 : 400,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: 5,
                  opacity: 0.8,
                  fontSize: 11,
                  background: direction === tab.id ? "rgba(255,255,255,0.2)" : "#1e293b",
                  padding: "0px 5px",
                  borderRadius: 8,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Strategy type filter */}
        {strategyTypes.length > 0 && (
          <select
            value={strategyType}
            onChange={(e) => setStrategyType(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "#0d1424",
              color: C.textSecondary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value="all">All Strategies</option>
            {strategyTypes.map((t) => (
              <option key={t} value={t!}>{t}</option>
            ))}
          </select>
        )}

        {/* Min confidence filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 12 }}>Min confidence:</span>
          <select
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "#0d1424",
              color: C.textSecondary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value={0}>Any</option>
            <option value={50}>50+</option>
            <option value={65}>65+</option>
            <option value={75}>75+</option>
            <option value={85}>85+</option>
          </select>
        </div>

        {/* Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ color: C.textMuted, fontSize: 12 }}>Sort:</span>
          {(["recency", "strength", "confidence"] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => setSortField(field)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${sortField === field ? C.blue + "66" : C.border}`,
                background: sortField === field ? `${C.blue}18` : "transparent",
                color: sortField === field ? C.blue : C.textMuted,
                fontSize: 11,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.1s",
              }}
            >
              {field}
            </button>
          ))}
        </div>
      </div>

      {isBeginner && (
        <div
          style={{
            padding: "10px 14px",
            background: `${C.blue}0d`,
            border: `1px solid ${C.blue}22`,
            borderRadius: 8,
            fontSize: 12,
            color: C.textSecondary,
            marginBottom: 16,
          }}
        >
          📚 <strong>What is a signal?</strong> A signal is a recommendation to buy (Long) or sell short (Short) an asset. Confidence (0–100) shows how strongly conditions are met. Click any card to see full reasoning.
        </div>
      )}

      {loading && !signals.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={130} />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon="📈"
          title="No signals match filters"
          subtitle="Try adjusting direction, strategy type, or minimum confidence."
        />
      ) : isProfessional ? (
        <ProSignalsTable signals={filtered} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((sig) => (
            <SignalCard key={sig.id} signal={sig} />
          ))}
        </div>
      )}

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 14 }}>
        {filtered.length} of {signals.length} signal{signals.length !== 1 ? "s" : ""}
      </p>

      <AlertHistory />
      </>)}
    </div>
  );
}
