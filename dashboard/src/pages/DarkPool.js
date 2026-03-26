import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, Card, SectionTitle, EmptyState, ErrorBanner, SkeletonBlock, useBeginnerMode, TH, TD } from "../context.js";

function shortRatioColor(ratio) {
  if (ratio >= 0.6) return C.red;
  if (ratio >= 0.4) return C.amber;
  return C.green;
}

function HeavyShortBadge() {
  return _jsx("span", {
    style: {
      color: C.red,
      background: `${C.red}18`,
      border: `1px solid ${C.red}44`,
      padding: "1px 6px",
      borderRadius: 3,
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.03em",
    },
    children: "HEAVY SHORT",
  });
}

function MarketWideGauge({ ratio }) {
  const pct = Math.min(100, ratio * 100);
  const color = shortRatioColor(ratio);
  return _jsxs(Card, {
    style: { padding: "16px 20px" },
    children: [
      _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }, children: "Market-Wide Short Ratio" }),
      _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [
        // Gauge arc (simple bar)
        _jsxs("div", { style: { flex: 1 }, children: [
          _jsx("div", { style: { height: 12, background: "#1e293b", borderRadius: 6, overflow: "hidden", marginBottom: 6 }, children:
            _jsx("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.5s ease" } })
          }),
          _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
            _jsx("span", { style: { color: C.green, fontSize: 10 }, children: "0%" }),
            _jsx("span", { style: { color: C.amber, fontSize: 10 }, children: "40%" }),
            _jsx("span", { style: { color: C.red, fontSize: 10 }, children: "60%+" }),
          ] }),
        ] }),
        _jsxs("div", { style: { textAlign: "right" }, children: [
          _jsxs("div", { style: { color, fontSize: 32, fontWeight: 800, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }, children: [(pct).toFixed(1), "%"] }),
          _jsx("div", { style: { color: C.textMuted, fontSize: 11 }, children: "avg across all tickers" }),
        ] }),
      ] }),
    ],
  });
}

export function DarkPool() {
  const { beginnerMode } = useBeginnerMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [heavyOnly, setHeavyOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/v1/dark-pool?date=latest");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLastUpdated(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return _jsxs("div", { style: { padding: 28 }, children: [
      _jsx(SkeletonBlock, { height: 40 }),
      _jsx("div", { style: { marginTop: 20 }, children: _jsx(SkeletonBlock, { height: 320 }) }),
    ] });
  }

  if (error) {
    return _jsxs("div", { style: { padding: 28 }, children: [
      _jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 24 }, children: "Dark Pool & Short Volume Monitor" }),
      _jsx(ErrorBanner, { message: `Dark pool data unavailable: ${error}`, onRetry: () => window.location.reload() }),
      _jsx("div", { style: { padding: "20px", color: C.textMuted, fontSize: 13, textAlign: "center" }, children: "FINRA short sale data is updated daily after market close. Try again later." }),
    ] });
  }

  // Normalize response: may be array of tickers or { tickers: [...], date: '...' }
  const tickers = Array.isArray(data) ? data : (data?.tickers ?? data?.data ?? []);
  const reportDate = data?.date ?? data?.reportDate ?? null;

  // Sort by shortRatio descending, take top 20
  const sorted = [...tickers]
    .sort((a, b) => Number(b.shortRatio ?? b.short_ratio ?? 0) - Number(a.shortRatio ?? a.short_ratio ?? 0))
    .slice(0, 20)
    .map((t) => ({
      ticker: t.ticker ?? t.symbol ?? "—",
      shortVolume: Number(t.shortVolume ?? t.short_volume ?? 0),
      totalVolume: Number(t.totalVolume ?? t.total_volume ?? 0),
      shortRatio: Number(t.shortRatio ?? t.short_ratio ?? 0),
      isHeavy: Number(t.shortRatio ?? t.short_ratio ?? 0) >= 0.6,
    }));

  const displayed = heavyOnly ? sorted.filter((t) => t.isHeavy) : sorted;

  // Market-wide average short ratio
  const marketAvgRatio = tickers.length > 0
    ? tickers.reduce((s, t) => s + Number(t.shortRatio ?? t.short_ratio ?? 0), 0) / tickers.length
    : null;

  const fmtVol = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return String(n);
  };

  const fmtTime = lastUpdated
    ? lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—";

  // Chart data: top 15 for bar chart
  const chartData = sorted.slice(0, 15).map((t) => ({ name: t.ticker, ratio: +(t.shortRatio * 100).toFixed(1) }));

  return _jsxs("div", { style: { padding: 28, maxWidth: 1200 }, children: [
    // Header
    _jsxs("div", { style: { marginBottom: 24 }, children: [
      _jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }, children: [
        _jsxs("div", { children: [
          _jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Dark Pool & Short Volume Monitor" }),
          _jsxs("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: [
            "FINRA short sale volume data",
            reportDate && _jsxs("span", { style: { marginLeft: 8 }, children: ["· Report date: ", reportDate] }),
            _jsxs("span", { style: { marginLeft: 8 }, children: ["· Loaded ", fmtTime] }),
          ] }),
        ] }),
        // Heavy Short filter toggle
        _jsx("button", {
          onClick: () => setHeavyOnly((v) => !v),
          style: {
            padding: "7px 16px",
            borderRadius: 8,
            border: `1px solid ${heavyOnly ? C.red + "88" : C.border}`,
            background: heavyOnly ? `${C.red}18` : "transparent",
            color: heavyOnly ? "#fca5a5" : C.textSecondary,
            fontSize: 13,
            fontWeight: heavyOnly ? 700 : 400,
            cursor: "pointer",
            transition: "all 0.12s",
          },
          children: heavyOnly ? "🔴 Heavy Short Only" : "Show Heavy Short Only",
        }),
      ] }),
    ] }),

    // Beginner tip
    beginnerMode && _jsxs("div", {
      style: { padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary, marginBottom: 20 },
      children: ["📚 ", _jsx("strong", { children: "What is dark pool short volume?" }), " High short volume means many traders are betting a stock will fall. This can signal coming price drops — but can also cause a \"short squeeze\" rally if the stock moves up instead."],
    }),

    // Market-wide gauge
    marketAvgRatio != null && _jsxs("div", { style: { marginBottom: 24 }, children: [
      _jsx(MarketWideGauge, { ratio: marketAvgRatio }),
    ] }),

    // Short ratio bar chart
    chartData.length > 0 && _jsxs("div", { style: { marginBottom: 24 }, children: [
      _jsx(SectionTitle, { children: "Short Ratio by Ticker (Top 15)" }),
      _jsx(Card, { children: _jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(BarChart, { data: chartData, layout: "vertical", margin: { top: 5, right: 40, bottom: 5, left: 20 }, children: [
        _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", horizontal: false }),
        _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fill: C.textMuted, fontSize: 10 }, axisLine: false, tickLine: false, tickFormatter: (v) => `${v}%` }),
        _jsx(YAxis, { type: "category", dataKey: "name", tick: { fill: C.textSecondary, fontSize: 11, fontWeight: 600, fontFamily: "monospace" }, axisLine: false, tickLine: false, width: 50 }),
        _jsx(Tooltip, { contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 12 }, formatter: (val) => [`${val}%`, "Short Ratio"] }),
        _jsx(Bar, { dataKey: "ratio", radius: [0, 4, 4, 0], children:
          chartData.map((entry, i) => _jsx(Cell, { fill: shortRatioColor(entry.ratio / 100) + "cc" }, i))
        }),
      ] }) }) }),
    ] }),

    // Top 20 table
    _jsxs("div", { style: { marginBottom: 24 }, children: [
      _jsxs(SectionTitle, { children: ["Top ", heavyOnly ? "Heavy Short" : "20 Most-Shorted", " Tickers"] }),
      displayed.length === 0
        ? _jsx(EmptyState, { icon: "📊", title: "No data", subtitle: heavyOnly ? "No tickers with short ratio > 60% found." : "No dark pool data available." })
        : _jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children:
          _jsx("div", { style: { overflowX: "auto" }, children:
            _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [
              _jsx("thead", { children: _jsxs("tr", { children: [
                _jsx("th", { style: TH, children: "Ticker" }),
                _jsx("th", { style: TH, children: "Short Volume" }),
                _jsx("th", { style: TH, children: "Total Volume" }),
                _jsx("th", { style: TH, children: "Short Ratio" }),
                _jsx("th", { style: TH, children: "Signal" }),
              ] }) }),
              _jsx("tbody", { children: displayed.map((t) => {
                const ratioColor = shortRatioColor(t.shortRatio);
                return _jsxs("tr", { children: [
                  _jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 14 }, children: t.ticker }),
                  _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtVol(t.shortVolume) }),
                  _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtVol(t.totalVolume) }),
                  _jsx("td", { style: { ...TD }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                    // Mini bar
                    _jsx("div", { style: { width: 60, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", flexShrink: 0 }, children:
                      _jsx("div", { style: { width: `${Math.min(100, t.shortRatio * 100)}%`, height: "100%", background: ratioColor, borderRadius: 3 } })
                    }),
                    _jsxs("span", { style: { color: ratioColor, fontFamily: "monospace", fontWeight: 700, fontSize: 12 }, children: [(t.shortRatio * 100).toFixed(1), "%"] }),
                  ] }) }),
                  _jsx("td", { style: TD, children: t.isHeavy ? _jsx(HeavyShortBadge, {}) : _jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "—" }) }),
                ] }, t.ticker);
              }) }),
            ] })
          })
        }),
    ] }),
  ] });
}
