import { useEffect, useState } from "react";
import { getSignals } from "../api.js";
import {
  C,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  useBeginnerMode,
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
  const { beginnerMode } = useBeginnerMode();
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

          {beginnerMode && (
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

export function Signals() {
  const { beginnerMode } = useBeginnerMode();
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Trading Signals
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          {activeCount} active · {signals.length} total · auto-refreshes every 60s
        </p>
      </div>

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
    </div>
  );
}
