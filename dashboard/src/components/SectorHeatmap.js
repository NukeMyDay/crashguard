import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { C, Card, useExpertise } from "../context.js";

const SECTORS = [
  { name: "Technology", etf: "XLK", desc: "Companies that make software and chips" },
  { name: "Financials", etf: "XLF", desc: "Banks, insurance companies, and investment firms" },
  { name: "Energy", etf: "XLE", desc: "Oil, gas, and energy companies" },
  { name: "Healthcare", etf: "XLV", desc: "Hospitals, drug makers, and medical devices" },
  { name: "Industrials", etf: "XLI", desc: "Manufacturing, aerospace, and defense" },
  { name: "Communication", etf: "XLC", desc: "Social media, telecom, and media companies" },
  { name: "Consumer Disc", etf: "XLY", desc: "Retail, restaurants, and entertainment" },
  { name: "Con. Staples", etf: "XLP", desc: "Food, beverage, and household products" },
  { name: "Materials", etf: "XLB", desc: "Mining, chemicals, and construction materials" },
  { name: "Real Estate", etf: "XLRE", desc: "Property companies and REITs" },
  { name: "Utilities", etf: "XLU", desc: "Electric, gas, and water utilities" },
];

function sectorColor(change1d, min, max) {
  if (max === min) return "#1e293b";
  const t = (change1d - min) / (max - min);
  if (t >= 0.5) {
    const factor = (t - 0.5) * 2;
    const r = Math.round(30 + (16 - 30) * factor);
    const g = Math.round(41 + (185 - 41) * factor);
    const b = Math.round(59 + (129 - 59) * factor);
    return `rgb(${r},${g},${b})`;
  } else {
    const factor = t * 2;
    const r = Math.round(239 + (30 - 239) * factor);
    const g = Math.round(68 + (41 - 68) * factor);
    const b = Math.round(68 + (59 - 68) * factor);
    return `rgb(${r},${g},${b})`;
  }
}

function generateMockData() {
  return SECTORS.map((s) => ({
    ...s,
    changeDay: (Math.random() * 4 - 2),
    changeWeek: (Math.random() * 8 - 4),
    relativeVsSpy: (Math.random() * 2 - 1),
    volume: Math.floor(Math.random() * 20000000) + 5000000,
    avgVolume20d: Math.floor(Math.random() * 12000000) + 5000000,
  }));
}

export function SectorHeatmap() {
  const { isBeginner, isProfessional } = useExpertise();
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [period, setPeriod] = useState("1D"); // "1D" or "1W"

  useEffect(() => {
    let cancelled = false;
    let prevData = null;

    async function load() {
      try {
        const res = await fetch("/v1/sectors");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data) && data.length > 0) {
            // Normalize field names: support changeDay/change1d and changeWeek/change1w
            const normalized = data.map((s) => ({
              ...s,
              changeDay: s.changeDay ?? s.change1d ?? 0,
              changeWeek: s.changeWeek ?? s.change1w ?? 0,
              relativeVsSpy: s.relativeVsSpy ?? null,
              volume: s.volume ?? null,
              avgVolume20d: s.avgVolume20d ?? null,
            }));
            prevData = normalized;
            setSectors(normalized);
            setIsMock(false);
            setIsStale(false);
            setLastUpdated(new Date());
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through */ }

      if (!cancelled) {
        if (prevData) {
          // Keep previous values, mark as stale
          setIsStale(true);
        } else {
          setSectors(generateMockData());
          setIsMock(true);
        }
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return _jsx(Card, {
      style: { padding: "16px 18px" },
      children: _jsx("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 },
        children: SECTORS.map((_, i) =>
          _jsx("div", { style: { height: 80, background: "#1e293b", borderRadius: 8, opacity: 0.5 } }, i)
        ),
      }),
    });
  }

  // Sort by relativeVsSpy descending (best performers top-left)
  const sortedSectors = [...sectors].sort((a, b) => {
    const aRel = a.relativeVsSpy ?? a.changeDay ?? 0;
    const bRel = b.relativeVsSpy ?? b.changeDay ?? 0;
    return bRel - aRel;
  });

  const changeKey = period === "1D" ? "changeDay" : "changeWeek";
  const changes = sortedSectors.map((s) => s[changeKey] ?? 0);
  const min = Math.min(...changes);
  const max = Math.max(...changes);

  const fmtTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return _jsxs(Card, {
    style: { padding: "16px 18px" },
    children: [
      // Header row
      _jsxs("div", {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 },
        children: [
          _jsxs("div", {
            style: { display: "flex", alignItems: "center", gap: 10 },
            children: [
              _jsx("span", { style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "🌡️ Sector Rotation Heatmap" }),
              isMock && _jsx("span", { style: { color: C.textMuted, fontSize: 10, fontStyle: "italic" }, children: "demo data" }),
              isStale && _jsx("span", { style: { color: C.amber, background: `${C.amber}18`, border: `1px solid ${C.amber}44`, padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700 }, children: "STALE" }),
            ],
          }),
          _jsxs("div", {
            style: { display: "flex", alignItems: "center", gap: 8 },
            children: [
              fmtTime && _jsxs("span", { style: { color: C.textMuted, fontSize: 10 }, children: ["Updated ", fmtTime] }),
              // Period toggle
              _jsxs("div", {
                style: { display: "flex", background: "#0d1424", border: `1px solid ${C.border}`, borderRadius: 6, padding: 2, gap: 2 },
                children: [
                  _jsx("button", {
                    onClick: () => setPeriod("1D"),
                    style: { padding: "3px 10px", borderRadius: 4, border: "none", background: period === "1D" ? `${C.blue}33` : "transparent", color: period === "1D" ? C.blue : C.textMuted, fontSize: 11, fontWeight: period === "1D" ? 700 : 400, cursor: "pointer" },
                    children: "1D",
                  }),
                  _jsx("button", {
                    onClick: () => setPeriod("1W"),
                    style: { padding: "3px 10px", borderRadius: 4, border: "none", background: period === "1W" ? `${C.blue}33` : "transparent", color: period === "1W" ? C.blue : C.textMuted, fontSize: 11, fontWeight: period === "1W" ? 700 : 400, cursor: "pointer" },
                    children: "1W",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Beginner tip
      isBeginner && _jsxs("div", {
        style: { padding: "8px 12px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary, marginBottom: 12 },
        children: ["📚 ", _jsx("strong", { children: "Beginner tip:" }), " Deep green = sector leading the market. Deep red = lagging. Click a tile to open Yahoo Finance. Use 1D/1W toggle to switch timeframe."],
      }),
      // Tiles grid
      _jsx("div", {
        style: { display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isProfessional ? "80px" : "110px"}, 1fr))`, gap: isProfessional ? 6 : 8 },
        children: sortedSectors.map((sector) => {
          const changeVal = sector[changeKey] ?? 0;
          const bg = sectorColor(changeVal, min, max);
          const changeColor = changeVal >= 0 ? "#86efac" : "#fca5a5";
          const isHighVol = sector.volume != null && sector.avgVolume20d != null && sector.volume > 1.5 * sector.avgVolume20d;
          const relVsSpy = sector.relativeVsSpy;

          return _jsx("a", {
            href: `https://finance.yahoo.com/quote/${sector.etf}`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { textDecoration: "none" },
            children: _jsxs("div", {
              style: { background: bg, borderRadius: 8, padding: isProfessional ? "8px 10px" : "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, minHeight: isProfessional ? 64 : 76, position: "relative" },
              children: [
                // HIGH VOL badge
                isHighVol && _jsx("div", {
                  style: { position: "absolute", top: 4, right: 4, background: `${C.amber}cc`, color: "#000", fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 3, letterSpacing: "0.03em" },
                  children: "HIGH VOL",
                }),
                !isProfessional && _jsx("div", { style: { color: "#f1f5f9", fontSize: 10, fontWeight: 600, lineHeight: 1.2 }, children: sector.name }),
                _jsx("div", { style: { color: "#f1f5f9", fontSize: isProfessional ? 10 : 11, fontWeight: 700, fontFamily: "monospace" }, children: sector.etf }),
                _jsxs("div", { style: { color: changeColor, fontSize: isProfessional ? 13 : 15, fontWeight: 800, fontFamily: "monospace" }, children: [changeVal >= 0 ? "+" : "", changeVal.toFixed(2), "%"] }),
                // Professional mode: relativeVsSpy
                isProfessional && relVsSpy != null && _jsxs("div", {
                  style: { color: relVsSpy >= 0 ? "#86efac" : "#fca5a5", fontSize: 9, fontFamily: "monospace", marginTop: 1 },
                  children: [relVsSpy >= 0 ? "+" : "", relVsSpy.toFixed(2), "% vs SPY"],
                }),
                // Non-professional: show week change
                !isProfessional && period === "1D" && _jsxs("div", { style: { color: (sector.changeWeek ?? 0) >= 0 ? "#86efac" : "#fca5a5", fontSize: 10, fontFamily: "monospace" }, children: ["1W: ", (sector.changeWeek ?? 0) >= 0 ? "+" : "", (sector.changeWeek ?? 0).toFixed(2), "%"] }),
                !isProfessional && isBeginner && sector.desc && _jsx("div", { style: { color: "#94a3b8", fontSize: 9, lineHeight: 1.2, marginTop: 1 }, children: sector.desc }),
              ],
            }),
          }, sector.etf);
        }),
      }),
    ],
  });
}
