import { useEffect, useState, useRef } from "react";
import { fetchJSON } from "../api.js";
import { C, Card, EmptyState, ErrorBanner, useExpertise } from "../context.js";

interface WatchlistItem {
  id: string;
  ticker: string;
  price?: number;
  prevPrice?: number;
  changePct?: number;
  alertThreshold?: number;
  notes?: string;
  companyName?: string;
}

export function Watchlist() {
  const { isBeginner, isProfessional } = useExpertise();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut W → focus input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "w" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadWatchlist() {
    try {
      const data = await fetchJSON("/watchlist");
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      // Watchlist endpoint may not exist — use local state only
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWatchlist();
    const interval = setInterval(loadWatchlist, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function addTicker() {
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    if (items.some((i) => i.ticker === t)) {
      setNewTicker("");
      return;
    }
    setAdding(true);
    try {
      const data = await fetchJSON("/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t }),
      });
      setItems((prev) => [...prev, data as WatchlistItem]);
    } catch {
      // Fallback: add locally with no price data
      setItems((prev) => [...prev, { id: t + Date.now(), ticker: t }]);
    } finally {
      setNewTicker("");
      setAdding(false);
    }
  }

  async function removeTicker(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetchJSON(`/watchlist/${id}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
  }

  async function saveThreshold(id: string) {
    const val = parseFloat(thresholdDraft);
    if (isNaN(val)) {
      setEditingThreshold(null);
      return;
    }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, alertThreshold: val } : i));
    setEditingThreshold(null);
    try {
      await fetchJSON(`/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertThreshold: val }),
      });
    } catch {
      // best-effort
    }
  }

  const priceColor = (item: WatchlistItem) => {
    if (item.changePct == null) return C.textSecondary;
    return item.changePct >= 0 ? C.green : C.red;
  };

  const thresholdBreached = (item: WatchlistItem) =>
    item.alertThreshold != null && item.price != null && item.price >= item.alertThreshold;

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Watchlist</h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Track tickers with live prices · auto-refreshes every 60s · press W to add
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadWatchlist} />}

      {/* Add ticker bar */}
      <Card style={{ padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter ticker symbol (e.g. AAPL)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addTicker()}
            style={{
              flex: 1,
              background: "#090f1a",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "9px 14px",
              color: C.textPrimary,
              fontSize: 14,
              fontFamily: "monospace",
              fontWeight: 700,
              outline: "none",
              letterSpacing: "0.04em",
            }}
          />
          <button
            onClick={addTicker}
            disabled={adding || !newTicker.trim()}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: C.blue,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: adding || !newTicker.trim() ? "not-allowed" : "pointer",
              opacity: adding || !newTicker.trim() ? 0.5 : 1,
              transition: "opacity 0.12s",
            }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {isBeginner && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>
            📚 Type a stock ticker (like AAPL for Apple, or SPY for the S&amp;P 500 ETF) and press Add or Enter. Set an alert threshold — you'll see a warning badge if the price crosses that level.
          </div>
        )}
      </Card>

      {/* Table */}
      {loading ? (
        <div style={{ height: 200, background: "#1e293b", borderRadius: 10, opacity: 0.4 }} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="👁"
          title="Add tickers to track"
          subtitle="Type a symbol above — e.g. AAPL, SPY, QQQ, BTC-USD"
        />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TH}>Ticker</th>
                  {!isProfessional && <th style={TH}>Company</th>}
                  <th style={{ ...TH, textAlign: "right" }}>Price</th>
                  <th style={{ ...TH, textAlign: "right" }}>Change</th>
                  <th style={{ ...TH, textAlign: "right" }}>Alert Threshold</th>
                  {!isProfessional && <th style={TH}>Notes</th>}
                  <th style={TH} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isBreached = thresholdBreached(item);
                  const pColor = priceColor(item);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isBreached ? `${C.amber}0a` : i % 2 === 0 ? undefined : "#0d1424",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {/* Ticker */}
                      <td style={{ ...TD, fontFamily: "monospace", fontWeight: 700, color: C.textPrimary }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {item.ticker}
                          {isBreached && (
                            <span style={{
                              background: `${C.amber}22`,
                              border: `1px solid ${C.amber}66`,
                              color: C.amber,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontFamily: "sans-serif",
                            }}>
                              ⚠ ALERT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company name (non-professional) */}
                      {!isProfessional && (
                        <td style={{ ...TD, color: C.textMuted, fontSize: 12 }}>
                          {item.companyName ?? "—"}
                        </td>
                      )}

                      {/* Price */}
                      <td style={{ ...TD, textAlign: "right", fontFamily: "monospace", color: C.textPrimary, fontWeight: 600 }}>
                        {item.price != null ? `$${item.price.toFixed(2)}` : "—"}
                      </td>

                      {/* Change% */}
                      <td style={{ ...TD, textAlign: "right", fontFamily: "monospace", color: pColor, fontWeight: 600 }}>
                        {item.changePct != null
                          ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`
                          : "—"}
                      </td>

                      {/* Alert threshold */}
                      <td style={{ ...TD, textAlign: "right" }}>
                        {editingThreshold === item.id ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <input
                              type="number"
                              value={thresholdDraft}
                              onChange={(e) => setThresholdDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveThreshold(item.id);
                                if (e.key === "Escape") setEditingThreshold(null);
                              }}
                              autoFocus
                              style={{
                                width: 80,
                                background: "#090f1a",
                                border: `1px solid ${C.blue}`,
                                borderRadius: 6,
                                padding: "3px 8px",
                                color: C.textPrimary,
                                fontSize: 12,
                                fontFamily: "monospace",
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() => saveThreshold(item.id)}
                              style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: C.blue, color: "#fff", fontSize: 11, cursor: "pointer" }}
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingThreshold(item.id);
                              setThresholdDraft(item.alertThreshold?.toString() ?? "");
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: item.alertThreshold != null ? (isBreached ? C.amber : C.textSecondary) : C.textMuted,
                              fontFamily: "monospace",
                              fontSize: 12,
                              padding: "2px 6px",
                              borderRadius: 4,
                              textDecoration: "none",
                            }}
                            title="Click to set alert threshold"
                          >
                            {item.alertThreshold != null ? `$${item.alertThreshold.toFixed(2)}` : "Set…"}
                          </button>
                        )}
                      </td>

                      {/* Notes (non-professional) */}
                      {!isProfessional && (
                        <td style={{ ...TD, color: C.textMuted, fontSize: 12 }}>
                          {item.notes ?? "—"}
                        </td>
                      )}

                      {/* Remove */}
                      <td style={{ ...TD, textAlign: "right" }}>
                        <button
                          onClick={() => removeTicker(item.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: C.textMuted,
                            fontSize: 16,
                            padding: "2px 6px",
                            borderRadius: 4,
                            lineHeight: 1,
                          }}
                          title="Remove from watchlist"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 10 }}>{items.length} ticker{items.length !== 1 ? "s" : ""} tracked</p>
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  color: "#475569",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "#0d1424",
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "10px 12px",
  color: C.textSecondary,
  verticalAlign: "middle",
};
