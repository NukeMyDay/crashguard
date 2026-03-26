import { useEffect, useState, useRef } from "react";
import { getScanner } from "../api.js";
import {
  C,
  Card,
  InfoIcon,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  useExpertise,
  TH,
  TD,
} from "../context.js";

type ScannerType = "penny" | "oversold" | "short" | "options";

interface ScanResult {
  ticker?: string;
  symbol?: string;
  name?: string;
  companyName?: string;
  price?: number;
  change?: number;
  changePct?: number;
  score?: number;
  volumeSpikePct?: number;
  rsi?: number;
  ivPct?: number;
  type?: string;
  reasons?: string[];
  volumeRatio?: number;
}

const TABS: { label: string; type: ScannerType; description: string }[] = [
  {
    label: "Penny Stocks",
    type: "penny",
    description: 'Stocks under $5 with unusual volume spikes (>3x 30-day average). High risk, high reward.',
  },
  {
    label: "Oversold",
    type: "oversold",
    description: 'S&P 500 stocks with RSI below 30. Historically, 65% bounce within 2 weeks.',
  },
  {
    label: "Short Candidates",
    type: "short",
    description:
      "Stocks with RSI above 75 and declining relative strength. Candidates for put options or short selling.",
  },
  {
    label: "Options",
    type: "options",
    description: "High implied volatility situations suitable for options strategies.",
  },
];

function ScoreBar({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const pct = Math.min(100, Math.max(0, value));
  let color = C.green;
  if (inverted) {
    // For short candidates: high score = high risk
    if (pct >= 75) color = C.red;
    else if (pct >= 50) color = "#f97316";
    else if (pct >= 25) color = C.amber;
    else color = C.green;
  } else {
    if (pct >= 75) color = C.green;
    else if (pct >= 50) color = "#3b82f6";
    else if (pct >= 25) color = C.amber;
    else color = C.textMuted;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 80,
          height: 6,
          background: "#1e293b",
          borderRadius: 3,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(0)}
      </span>
    </div>
  );
}

function getRsiColor(rsi: number, isShort: boolean): string {
  if (isShort) {
    if (rsi > 70) return C.red;
    if (rsi >= 60) return "#f97316";
    return C.textMuted;
  } else {
    if (rsi < 30) return C.green;
    if (rsi <= 40) return C.amber;
    return C.textMuted;
  }
}

function TickerCell({ row }: { row: ScanResult }) {
  // CRITICAL: show the actual ticker symbol - check multiple field names
  const ticker = row.ticker ?? row.symbol ?? "N/A";
  const name = row.companyName ?? row.name;
  return (
    <div>
      <div style={{ color: C.textPrimary, fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
        {ticker}
      </div>
      {name && (
        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{name}</div>
      )}
    </div>
  );
}

function PriceCell({ row }: { row: ScanResult }) {
  if (row.price == null) return <span style={{ color: C.textMuted }}>—</span>;
  const change = row.changePct ?? row.change;
  const isPos = change != null && change > 0;
  const isNeg = change != null && change < 0;
  return (
    <div>
      <div style={{ color: C.textPrimary, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        ${Number(row.price).toFixed(2)}
      </div>
      {change != null && (
        <div
          style={{
            fontSize: 11,
            color: isPos ? C.green : isNeg ? C.red : C.textMuted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isPos ? "+" : ""}{Number(change).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function ScanTable({
  data,
  type,
  sortCol,
  onSort,
}: {
  data: ScanResult[];
  type: ScannerType;
  sortCol: string;
  onSort: (col: string) => void;
}) {
  if (!data.length) {
    return (
      <EmptyState
        icon="🔍"
        title="No results found for this scan"
        subtitle="Scanner runs hourly. Check back soon or try a different tab."
      />
    );
  }

  function SortHeader({ col, children }: { col: string; children: React.ReactNode }) {
    const isActive = sortCol === col;
    return (
      <th
        style={{ ...TH, cursor: "pointer", userSelect: "none" }}
        onClick={() => onSort(col)}
      >
        <span style={{ color: isActive ? C.blue : undefined }}>{children}</span>
        {isActive && <span style={{ marginLeft: 4, color: C.blue }}>↓</span>}
      </th>
    );
  }

  if (type === "penny") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>Ticker</th>
            <SortHeader col="price">Price</SortHeader>
            <SortHeader col="volumeSpikePct">Volume Spike</SortHeader>
            <SortHeader col="score">Score</SortHeader>
            <th style={TH}>Reasons</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.ticker ?? row.symbol}>
              <td style={TD}><TickerCell row={row} /></td>
              <td style={TD}><PriceCell row={row} /></td>
              <td style={{ ...TD, color: "#6366f1", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {row.volumeSpikePct != null ? `+${Number(row.volumeSpikePct).toFixed(1)}%` : "—"}
              </td>
              <td style={TD}><ScoreBar value={row.score ?? 0} /></td>
              <td style={{ ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }}>
                {row.reasons?.join(" · ") ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === "oversold") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>Ticker</th>
            <SortHeader col="price">Price</SortHeader>
            <SortHeader col="rsi">RSI <InfoIcon text="Relative Strength Index measures if an asset is overbought (>70) or oversold (<30)" /></SortHeader>
            <SortHeader col="score">Score</SortHeader>
            <th style={TH}>Reasons</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rsiColor = row.rsi != null ? getRsiColor(row.rsi, false) : C.textMuted;
            return (
              <tr key={row.ticker ?? row.symbol}>
                <td style={TD}><TickerCell row={row} /></td>
                <td style={TD}><PriceCell row={row} /></td>
                <td style={{ ...TD, color: rsiColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {row.rsi != null ? Number(row.rsi).toFixed(1) : "—"}
                </td>
                <td style={TD}><ScoreBar value={row.score ?? 0} /></td>
                <td style={{ ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }}>
                  {row.reasons?.join(" · ") ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  if (type === "short") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>Ticker</th>
            <SortHeader col="price">Price</SortHeader>
            <SortHeader col="rsi">RSI</SortHeader>
            <SortHeader col="score">Score</SortHeader>
            <th style={TH}>Reasons</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rsiColor = row.rsi != null ? getRsiColor(row.rsi, true) : C.textMuted;
            return (
              <tr key={row.ticker ?? row.symbol}>
                <td style={TD}><TickerCell row={row} /></td>
                <td style={TD}><PriceCell row={row} /></td>
                <td style={{ ...TD, color: rsiColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {row.rsi != null ? Number(row.rsi).toFixed(1) : "—"}
                </td>
                <td style={TD}><ScoreBar value={row.score ?? 0} inverted /></td>
                <td style={{ ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }}>
                  {row.reasons?.join(" · ") ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // options
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={TH}>Ticker</th>
          <SortHeader col="price">Price</SortHeader>
          <SortHeader col="ivPct">IV%</SortHeader>
          <th style={TH}>Type</th>
          <th style={TH}>Reasons</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const isPut = row.type?.toLowerCase().includes("put");
          const typeColor = isPut ? C.red : C.green;
          return (
            <tr key={row.ticker ?? row.symbol}>
              <td style={TD}><TickerCell row={row} /></td>
              <td style={TD}><PriceCell row={row} /></td>
              <td style={{ ...TD, color: "#8b5cf6", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {row.ivPct != null ? `${Number(row.ivPct).toFixed(1)}%` : "—"}
              </td>
              <td style={TD}>
                {row.type ? (
                  <span
                    style={{
                      color: typeColor,
                      background: `${typeColor}1a`,
                      border: `1px solid ${typeColor}44`,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {isPut ? "PUT" : "CALL"}
                  </span>
                ) : (
                  <span style={{ color: C.textMuted }}>—</span>
                )}
              </td>
              <td style={{ ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }}>
                {row.reasons?.join(" · ") ?? "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function sortData(data: ScanResult[], col: string): ScanResult[] {
  return [...data].sort((a, b) => {
    const av = (a as any)[col] ?? -Infinity;
    const bv = (b as any)[col] ?? -Infinity;
    return bv - av;
  });
}

export function Scanner() {
  const { isBeginner, isProfessional } = useExpertise();
  const [activeTab, setActiveTab] = useState<ScannerType>("penny");
  const [sortColMap, setSortColMap] = useState<Record<ScannerType, string>>({
    penny: "score",
    oversold: "score",
    short: "score",
    options: "ivPct",
  });
  const [dataMap, setDataMap] = useState<Partial<Record<ScannerType, ScanResult[]>>>({});
  const [loadingMap, setLoadingMap] = useState<Partial<Record<ScannerType, boolean>>>({});
  const [errorMap, setErrorMap] = useState<Partial<Record<ScannerType, string>>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadTab(type: ScannerType) {
    setLoadingMap((prev) => ({ ...prev, [type]: true }));
    try {
      const data = await getScanner(type);
      setDataMap((prev) => ({ ...prev, [type]: Array.isArray(data) ? data : [] }));
      setErrorMap((prev) => ({ ...prev, [type]: undefined }));
    } catch (e) {
      setErrorMap((prev) => ({ ...prev, [type]: String(e) }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [type]: false }));
    }
  }

  useEffect(() => {
    loadTab(activeTab);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadTab(activeTab), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.type === activeTab)!;
  const rawData = dataMap[activeTab] ?? [];
  const sortCol = sortColMap[activeTab];
  const currentData = sortData(rawData, sortCol);
  const isLoading = loadingMap[activeTab];
  const currentError = errorMap[activeTab];

  function handleSort(col: string) {
    setSortColMap((prev) => ({ ...prev, [activeTab]: col }));
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Market Scanner
        </h1>
        <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
          Screened opportunities — auto-refreshes every 60 seconds
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 9,
                border: isActive ? `1px solid ${C.blue}44` : "1px solid transparent",
                background: isActive ? `${C.blue}1a` : "transparent",
                color: isActive ? C.blue : "#64748b",
                fontWeight: isActive ? 600 : 400,
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

      {/* Tab description */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          color: C.textMuted,
          fontSize: 13,
        }}
      >
        <span>{currentTab.description}</span>
        <InfoIcon text={currentTab.description} />
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
          📚 <strong>Click column headers to sort.</strong> Scores show opportunity strength (0–100).{" "}
          RSI (overbought/oversold indicator) below 30 = potential bounce. RSI above 70 = potential drop.{" "}
          Volume Spike means unusually high trading activity — often a sign of big news or moves.
        </div>
      )}

      {/* Content */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        {currentError && (
          <ErrorBanner
            message={`Failed to load scanner data: ${currentError}`}
            onRetry={() => loadTab(activeTab)}
          />
        )}

        {isLoading && !rawData.length ? (
          <div style={{ padding: 20 }}>
            <SkeletonBlock height={40} />
            <div style={{ marginTop: 8 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 44, background: i % 2 === 0 ? "transparent" : "#0a1120", borderBottom: `1px solid ${C.border}` }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <ScanTable data={currentData} type={activeTab} sortCol={sortCol} onSort={handleSort} />
          </div>
        )}
      </div>

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 12 }}>
        {currentData.length} result{currentData.length !== 1 ? "s" : ""} · Sorted by {sortCol}
      </p>
    </div>
  );
}
