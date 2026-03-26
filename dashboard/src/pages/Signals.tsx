import { useEffect, useState } from "react";
import { getSignals } from "../api.js";
import {
  C,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  InfoIcon,
  useBeginnerMode,
  TH,
  TD,
} from "../context.js";

interface Signal {
  id: string;
  instrument: string;
  action: string;
  strategy: string;
  confidence?: number;
  strength?: number;
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
}

type FilterTab = "all" | "active" | "long" | "short";

const ACTION_COLORS: Record<string, string> = {
  BUY: C.green,
  LONG: C.green,
  SELL: "#f97316",
  SHORT: C.red,
  CLOSE: "#6b7280",
};

function getDirectionLabel(action: string): { label: string; icon: string; color: string } {
  const a = action?.toUpperCase() ?? "";
  if (a === "BUY" || a === "LONG") return { label: "Long", icon: "↑", color: C.green };
  if (a === "SHORT" || a === "SELL") return { label: "Short", icon: "↓", color: C.red };
  return { label: a, icon: "→", color: C.textMuted };
}

function StrengthBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  let color = C.green;
  if (pct < 40) color = C.red;
  else if (pct < 65) color = C.amber;
  else if (pct < 80) color = "#3b82f6";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(0)}
      </span>
    </div>
  );
}

function PnLCell({ signal }: { signal: Signal }) {
  const entry = signal.entry ?? signal.entryPrice;
  const current = signal.currentPrice;
  if (!entry || !current) return <span style={{ color: C.textMuted }}>—</span>;

  const action = signal.action?.toUpperCase() ?? "";
  const isShort = action === "SHORT" || action === "SELL";
  const pnlPct = isShort
    ? ((entry - current) / entry) * 100
    : ((current - entry) / entry) * 100;
  const color = pnlPct >= 0 ? C.green : C.red;

  return (
    <span style={{ color, fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
      {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
    </span>
  );
}

function getAge(ts?: string): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getExpiry(ts?: string): string {
  if (!ts) return "—";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff < 0) return "Expired";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getStatusBorder(signal: Signal): string {
  const status = signal.status?.toLowerCase() ?? "active";
  if (status === "triggered" || status === "filled") return `1px solid ${C.green}44`;
  if (status === "expired" || status === "closed") return `1px solid #33333366`;
  return `1px solid ${C.border}`;
}

function getRowBg(signal: Signal, isExpanded: boolean, idx: number): string {
  if (isExpanded) return "#0d1b2e";
  const status = signal.status?.toLowerCase() ?? "active";
  if (status === "expired" || status === "closed") return "#0a0d14";
  return idx % 2 === 0 ? "transparent" : "#090e18";
}

function ExpandedRow({ signal, colSpan }: { signal: Signal; colSpan: number }) {
  const { beginnerMode } = useBeginnerMode();
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "16px 20px",
          background: "#090f1a",
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 20 }}>
          {/* Rationale */}
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Signal Reasoning
            </div>
            <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {signal.reason ?? signal.rationale ?? "No reasoning provided."}
            </p>
            {signal.relatedIndicators && signal.relatedIndicators.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 6 }}>Related Indicators</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {signal.relatedIndicators.map((ind) => (
                    <span
                      key={ind}
                      style={{
                        background: "#1e293b",
                        color: C.textSecondary,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Risk/Reward */}
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Risk / Reward
            </div>
            {(signal.entry ?? signal.entryPrice) != null && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
                Entry: <span style={{ color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                  ${Number(signal.entry ?? signal.entryPrice).toFixed(2)}
                </span>
              </div>
            )}
            {signal.target != null && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
                Target: <span style={{ color: C.green, fontVariantNumeric: "tabular-nums" }}>
                  ${Number(signal.target).toFixed(2)}
                </span>
              </div>
            )}
            {signal.stopLoss != null && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
                Stop Loss: <span style={{ color: C.red, fontVariantNumeric: "tabular-nums" }}>
                  ${Number(signal.stopLoss).toFixed(2)}
                </span>
              </div>
            )}
            {signal.rrRatio != null && (
              <div style={{ fontSize: 13, color: C.textSecondary }}>
                R/R Ratio: <span style={{ color: "#6366f1", fontWeight: 600 }}>
                  {Number(signal.rrRatio).toFixed(1)}x
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Details
            </div>
            {signal.strategy && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
                Strategy: {signal.strategy}
              </div>
            )}
            {signal.timeframe && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
                Timeframe: {signal.timeframe}
              </div>
            )}
          </div>
        </div>

        {beginnerMode && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: `${C.blue}0d`,
              border: `1px solid ${C.blue}22`,
              borderRadius: 8,
              fontSize: 12,
              color: C.textSecondary,
            }}
          >
            📚 <strong>Beginner tip:</strong> R/R ratio means Risk/Reward. A 3x ratio means you risk $1 to
            potentially earn $3. Higher is better. Always use stop losses to limit losses.
          </div>
        )}
      </td>
    </tr>
  );
}

function filterSignals(signals: Signal[], tab: FilterTab): Signal[] {
  if (tab === "all") return signals;
  if (tab === "active") {
    return signals.filter((s) => {
      const st = s.status?.toLowerCase() ?? "active";
      return st !== "expired" && st !== "closed" && st !== "cancelled";
    });
  }
  if (tab === "long") {
    return signals.filter((s) => {
      const a = s.action?.toUpperCase();
      return a === "BUY" || a === "LONG";
    });
  }
  if (tab === "short") {
    return signals.filter((s) => {
      const a = s.action?.toUpperCase();
      return a === "SELL" || a === "SHORT";
    });
  }
  return signals;
}

export function Signals() {
  const { beginnerMode } = useBeginnerMode();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("active");

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

  const filtered = filterSignals(signals, filterTab);
  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "long", label: "Long ↑" },
    { id: "short", label: "Short ↓" },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Trading Signals
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Live trade signals — click a row to expand reasoning
        </p>
      </div>

      {error && <ErrorBanner message={`Failed to load signals: ${error}`} onRetry={load} />}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: `1px solid ${filterTab === tab.id ? C.blue + "55" : C.border}`,
              background: filterTab === tab.id ? `${C.blue}1a` : "transparent",
              color: filterTab === tab.id ? C.blue : C.textMuted,
              fontWeight: filterTab === tab.id ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {tab.label}
            {tab.id !== "all" && (
              <span
                style={{
                  marginLeft: 6,
                  background: filterTab === tab.id ? `${C.blue}33` : "#1e293b",
                  color: filterTab === tab.id ? C.blue : C.textMuted,
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 11,
                }}
              >
                {filterSignals(signals, tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {beginnerMode && (
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
          📚 <strong>What is a signal?</strong> A signal is a recommendation to buy or sell an asset.
          Strength (0–100) indicates confidence — above 70 = high conviction. Click any row for full details.
        </div>
      )}

      {loading && !signals.length ? (
        <SkeletonBlock height={300} />
      ) : !filtered.length ? (
        <EmptyState
          icon="📈"
          title="No active signals"
          subtitle="Signals are generated hourly based on strategy rules and market conditions."
        />
      ) : (
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TH}>Status</th>
                  <th style={TH}>Instrument</th>
                  <th style={TH}>Direction</th>
                  <th style={TH}>Strategy</th>
                  <th style={{ ...TH, minWidth: 110 }}>
                    Strength{" "}
                    <InfoIcon text="Signal strength (0–100) indicates confluence of technical and fundamental factors. Above 70 = high conviction." />
                  </th>
                  <th style={TH}>Entry</th>
                  <th style={TH}>Current</th>
                  <th style={TH}>P&L %</th>
                  <th style={TH}>Generated</th>
                  <th style={TH}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sig, i) => {
                  const direction = getDirectionLabel(sig.action ?? "");
                  const isExpanded = expandedId === sig.id;
                  const entry = sig.entry ?? sig.entryPrice;
                  const generated = sig.createdAt ?? sig.generatedAt;

                  return (
                    <>
                      <tr
                        key={sig.id}
                        onClick={() => setExpandedId(isExpanded ? null : sig.id)}
                        style={{
                          background: getRowBg(sig, isExpanded, i),
                          cursor: "pointer",
                          borderLeft: getStatusBorder(sig),
                          transition: "background 0.12s",
                          opacity: sig.status?.toLowerCase() === "expired" ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "#111a2e";
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) (e.currentTarget as HTMLElement).style.background = getRowBg(sig, false, i);
                        }}
                      >
                        {/* Status dot */}
                        <td style={TD}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background:
                                  sig.status?.toLowerCase() === "expired"
                                    ? C.textMuted
                                    : sig.status?.toLowerCase() === "triggered"
                                    ? C.green
                                    : C.blue,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: C.textMuted, fontSize: 11, textTransform: "capitalize" }}>
                              {sig.status ?? "active"}
                            </span>
                          </div>
                        </td>

                        {/* Instrument */}
                        <td style={{ ...TD, color: C.textPrimary, fontWeight: 700, fontSize: 14 }}>
                          {sig.instrument ?? "—"}
                        </td>

                        {/* Direction */}
                        <td style={TD}>
                          <span
                            style={{
                              color: direction.color,
                              fontWeight: 700,
                              background: `${direction.color}1a`,
                              border: `1px solid ${direction.color}44`,
                              padding: "2px 10px",
                              borderRadius: 4,
                              fontSize: 12,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {direction.icon} {direction.label}
                          </span>
                        </td>

                        {/* Strategy */}
                        <td style={{ ...TD, color: C.textSecondary, fontSize: 12 }}>
                          {sig.strategy ?? "—"}
                        </td>

                        {/* Strength */}
                        <td style={TD}>
                          <StrengthBar value={sig.strength ?? sig.confidence ?? 0} />
                        </td>

                        {/* Entry */}
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                          {entry != null ? `$${Number(entry).toFixed(2)}` : "—"}
                        </td>

                        {/* Current */}
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
                          {sig.currentPrice != null ? `$${Number(sig.currentPrice).toFixed(2)}` : "—"}
                        </td>

                        {/* P&L */}
                        <td style={TD}>
                          <PnLCell signal={sig} />
                        </td>

                        {/* Generated */}
                        <td style={{ ...TD, color: C.textMuted, fontSize: 12 }}>
                          {getAge(generated)}
                        </td>

                        {/* Expires */}
                        <td
                          style={{
                            ...TD,
                            color: sig.expiresAt && new Date(sig.expiresAt) < new Date() ? C.red : C.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {getExpiry(sig.expiresAt)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <ExpandedRow key={`${sig.id}-exp`} signal={sig} colSpan={10} />
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 12 }}>
        {filtered.length} signal{filtered.length !== 1 ? "s" : ""} · Auto-refreshes every 60 seconds
      </p>
    </div>
  );
}
