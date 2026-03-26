import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getOptionsFlow } from "../api.js";
import { C, Card, SectionTitle, EmptyState, ErrorBanner, SkeletonBlock, useBeginnerMode, TH, TD, } from "../context.js";

function downloadCSV(rows, filename) {
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function TypePill({ type }) {
    const isCall = type?.toUpperCase() === "CALL";
    const color = isCall ? C.green : C.red;
    return _jsx("span", {
        style: {
            color,
            background: `${color}1a`,
            border: `1px solid ${color}44`,
            padding: "2px 9px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.03em",
        },
        children: isCall ? "CALL" : "PUT",
    });
}

function UnusualBadge() {
    return _jsx("span", {
        style: {
            color: C.amber,
            background: `${C.amber}18`,
            border: `1px solid ${C.amber}44`,
            padding: "1px 6px",
            borderRadius: 3,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.04em",
            marginLeft: 6,
        },
        children: "UNUSUAL",
    });
}

function SentimentDonut({ calls, puts }) {
    const total = calls + puts;
    if (total === 0) return null;
    const data = [
        { name: "Calls (Bullish)", value: calls, color: C.green },
        { name: "Puts (Bearish)", value: puts, color: C.red },
    ];
    const bullPct = ((calls / total) * 100).toFixed(0);
    const bearPct = ((puts / total) * 100).toFixed(0);
    return _jsxs(Card, {
        style: { padding: "16px 18px" },
        children: [
            _jsx("div", {
                style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
                children: "Sentiment Summary",
            }),
            _jsx(ResponsiveContainer, {
                width: "100%",
                height: 160,
                children: _jsxs(PieChart, {
                    children: [
                        _jsx(Pie, {
                            data,
                            cx: "50%",
                            cy: "50%",
                            innerRadius: 45,
                            outerRadius: 70,
                            dataKey: "value",
                            strokeWidth: 0,
                            children: data.map((entry, i) => _jsx(Cell, { fill: entry.color }, i)),
                        }),
                        _jsx(Tooltip, {
                            contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 },
                            formatter: (val, name) => [`${val} contracts`, name],
                        }),
                    ],
                }),
            }),
            _jsxs("div", {
                style: { display: "flex", justifyContent: "center", gap: 24, marginTop: 8 },
                children: [
                    _jsxs("div", {
                        style: { textAlign: "center" },
                        children: [
                            _jsx("div", { style: { color: C.green, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }, children: `${bullPct}%` }),
                            _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 2 }, children: "Bullish Calls" }),
                        ],
                    }),
                    _jsxs("div", {
                        style: { textAlign: "center" },
                        children: [
                            _jsx("div", { style: { color: C.red, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }, children: `${bearPct}%` }),
                            _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 2 }, children: "Bearish Puts" }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function SortButton({ label, field, sortField, setSortField, sortDir, setSortDir }) {
    const active = sortField === field;
    return _jsx("button", {
        onClick: () => {
            if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else { setSortField(field); setSortDir("desc"); }
        },
        style: {
            background: "none",
            border: "none",
            cursor: "pointer",
            color: active ? C.blue : C.textMuted,
            fontSize: 12,
            fontWeight: active ? 700 : 400,
            padding: "0 2px",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
        },
        children: [label, active ? (sortDir === "desc" ? " ↓" : " ↑") : ""],
    });
}

export function OptionsFlow() {
    const { beginnerMode } = useBeginnerMode();
    const [flow, setFlow] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState("volume");
    const [sortDir, setSortDir] = useState("desc");

    async function load() {
        try {
            const data = await getOptionsFlow();
            setFlow(Array.isArray(data) ? data : (data?.contracts ?? []));
            setError(null);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, 5 * 60000); // 5-minute refresh
        return () => clearInterval(interval);
    }, []);

    const sorted = [...flow].sort((a, b) => {
        const va = Number(a[sortField] ?? 0);
        const vb = Number(b[sortField] ?? 0);
        return sortDir === "desc" ? vb - va : va - vb;
    });

    const callCount = flow.filter((f) => f.type?.toUpperCase() === "CALL").length;
    const putCount = flow.filter((f) => f.type?.toUpperCase() === "PUT").length;
    const cpRatio = putCount > 0 ? (callCount / putCount).toFixed(2) : "—";
    const cpRatioColor = parseFloat(cpRatio) > 1 ? C.green : parseFloat(cpRatio) < 1 ? C.red : C.amber;
    const unusualCount = flow.filter((f) => f.unusual || f.isUnusual).length;

    const totalCallVol = flow.filter((f) => f.type?.toUpperCase() === "CALL").reduce((s, f) => s + Number(f.volume ?? 0), 0);
    const totalPutVol = flow.filter((f) => f.type?.toUpperCase() === "PUT").reduce((s, f) => s + Number(f.volume ?? 0), 0);

    function handleExport() {
        const headers = ["ticker", "type", "strike", "expiry", "volume", "openInterest", "iv", "sentiment", "time"];
        const rows = [headers, ...sorted.map((f) => [
            f.ticker ?? "",
            f.type ?? "",
            f.strike ?? "",
            f.expiry ?? "",
            f.volume ?? "",
            f.openInterest ?? f.oi ?? "",
            f.iv ?? f.impliedVolatility ?? "",
            f.sentiment ?? "",
            f.time ?? f.timestamp ?? "",
        ])];
        downloadCSV(rows, "options-flow.csv");
    }

    return _jsxs("div", {
        style: { padding: 28 },
        children: [
            // Header
            _jsxs("div", {
                style: { marginBottom: 24 },
                children: [
                    _jsx("h1", {
                        style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 },
                        children: beginnerMode ? "Smart Money Activity" : "Options Flow",
                    }),
                    _jsx("p", {
                        style: { color: C.textMuted, marginTop: 5, fontSize: 13 },
                        children: beginnerMode
                            ? "Track where big institutional money is placing options bets — unusual activity often signals major moves."
                            : "Unusual options activity · sorted by volume · auto-refreshes every 5 minutes",
                    }),
                ],
            }),

            error && _jsx(ErrorBanner, { message: `Failed to load options flow: ${error}`, onRetry: load }),

            // Top bar: Call/Put ratio + unusual count
            _jsxs("div", {
                style: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 },
                children: [
                    _jsxs(Card, {
                        style: { padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" },
                        children: [
                            _jsxs("div", {
                                children: [
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Call/Put Ratio" }),
                                    _jsx("div", { style: { color: cpRatioColor, fontSize: 32, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }, children: cpRatio }),
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 4 }, children: ">1 = bullish skew" }),
                                ],
                            }),
                        ],
                    }),
                    _jsxs(Card, {
                        style: { padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" },
                        children: [
                            _jsxs("div", {
                                children: [
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Unusual Activity" }),
                                    _jsx("div", { style: { color: C.amber, fontSize: 32, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }, children: unusualCount }),
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 4 }, children: "high-volume alerts" }),
                                ],
                            }),
                        ],
                    }),
                    _jsxs(Card, {
                        style: { padding: "14px 24px", display: "flex", alignItems: "center", gap: 20, flex: "0 0 auto" },
                        children: [
                            _jsxs("div", {
                                children: [
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Call Volume" }),
                                    _jsx("div", { style: { color: C.green, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }, children: totalCallVol.toLocaleString() }),
                                ],
                            }),
                            _jsxs("div", {
                                children: [
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Put Volume" }),
                                    _jsx("div", { style: { color: C.red, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }, children: totalPutVol.toLocaleString() }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),

            beginnerMode && _jsxs("div", {
                style: {
                    padding: "10px 14px",
                    background: `${C.blue}0d`,
                    border: `1px solid ${C.blue}22`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                    marginBottom: 20,
                },
                children: [
                    "📚 ", _jsx("strong", { children: "What is unusual options activity?" }),
                    " When a large number of options contracts are bought at once — especially before news — it may mean institutional investors (\"smart money\") are positioning for a big move. Calls = betting the stock goes UP. Puts = betting it goes DOWN.",
                ],
            }),

            // Main content: table + side panel
            _jsxs("div", {
                style: { display: "grid", gridTemplateColumns: "1fr 240px", gap: 24, alignItems: "start" },
                children: [
                    // Table
                    _jsxs("div", {
                        children: [
                            _jsxs("div", {
                                style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
                                children: [
                                    _jsx(SectionTitle, { children: "Unusual Options Activity" }),
                                    _jsx("button", {
                                        onClick: handleExport,
                                        style: {
                                            padding: "5px 14px",
                                            borderRadius: 7,
                                            border: `1px solid ${C.border}`,
                                            background: "transparent",
                                            color: C.textMuted,
                                            fontSize: 12,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
                                        },
                                        children: ["↓ Export CSV"],
                                    }),
                                ],
                            }),
                            loading && !flow.length ? (
                                _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [0,1,2,3,4].map((i) => _jsx(SkeletonBlock, { height: 44 }, i)) })
                            ) : !sorted.length ? (
                                _jsx(EmptyState, { icon: "📊", title: "No options flow data", subtitle: "Options flow data will appear when available." })
                            ) : (
                                _jsx("div", {
                                    style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" },
                                    children: _jsx("div", {
                                        style: { overflowX: "auto" },
                                        children: _jsxs("table", {
                                            style: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
                                            children: [
                                                _jsx("thead", {
                                                    children: _jsxs("tr", {
                                                        children: [
                                                            _jsx("th", { style: TH, children: "Ticker" }),
                                                            _jsx("th", { style: TH, children: "Type" }),
                                                            _jsx("th", { style: { ...TH, textAlign: "right" }, children: "Strike" }),
                                                            _jsx("th", { style: TH, children: "Expiry" }),
                                                            _jsx("th", { style: { ...TH, textAlign: "right" }, children: _jsx(SortButton, { label: "Volume", field: "volume", sortField, setSortField, sortDir, setSortDir }) }),
                                                            _jsx("th", { style: { ...TH, textAlign: "right" }, children: _jsx(SortButton, { label: "OI", field: "openInterest", sortField, setSortField, sortDir, setSortDir }) }),
                                                            _jsx("th", { style: { ...TH, textAlign: "right" }, children: _jsx(SortButton, { label: "IV%", field: "iv", sortField, setSortField, sortDir, setSortDir }) }),
                                                            _jsx("th", { style: TH, children: "Sentiment" }),
                                                            _jsx("th", { style: TH, children: "Time" }),
                                                        ],
                                                    }),
                                                }),
                                                _jsx("tbody", {
                                                    children: sorted.map((f, i) => {
                                                        const isUnusual = f.unusual || f.isUnusual;
                                                        const sentiment = f.sentiment?.toLowerCase();
                                                        const sentColor = sentiment === "bullish" ? C.green : sentiment === "bearish" ? C.red : C.amber;
                                                        const oi = f.openInterest ?? f.oi;
                                                        const iv = f.iv ?? f.impliedVolatility;
                                                        const time = f.time ?? f.timestamp;
                                                        return _jsxs("tr", {
                                                            style: { background: isUnusual ? `${C.amber}08` : undefined },
                                                            children: [
                                                                _jsxs("td", {
                                                                    style: { ...TD, color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 14 },
                                                                    children: [
                                                                        f.ticker ?? "—",
                                                                        isUnusual && _jsx(UnusualBadge, {}),
                                                                    ],
                                                                }),
                                                                _jsx("td", { style: TD, children: _jsx(TypePill, { type: f.type }) }),
                                                                _jsx("td", { style: { ...TD, textAlign: "right", fontFamily: "monospace" }, children: f.strike != null ? `$${Number(f.strike).toFixed(2)}` : "—" }),
                                                                _jsx("td", { style: { ...TD, color: C.textSecondary }, children: f.expiry ?? "—" }),
                                                                _jsx("td", { style: { ...TD, textAlign: "right", fontFamily: "monospace", color: C.textPrimary, fontWeight: 600 }, children: f.volume != null ? Number(f.volume).toLocaleString() : "—" }),
                                                                _jsx("td", { style: { ...TD, textAlign: "right", fontFamily: "monospace" }, children: oi != null ? Number(oi).toLocaleString() : "—" }),
                                                                _jsx("td", { style: { ...TD, textAlign: "right", fontFamily: "monospace", color: iv != null && Number(iv) > 60 ? C.red : C.textSecondary }, children: iv != null ? `${Number(iv).toFixed(1)}%` : "—" }),
                                                                _jsx("td", {
                                                                    style: TD,
                                                                    children: sentiment ? _jsx("span", {
                                                                        style: {
                                                                            color: sentColor,
                                                                            background: `${sentColor}18`,
                                                                            border: `1px solid ${sentColor}44`,
                                                                            padding: "1px 7px",
                                                                            borderRadius: 3,
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
                                                                            textTransform: "capitalize",
                                                                        },
                                                                        children: sentiment,
                                                                    }) : _jsx("span", { style: { color: C.textMuted }, children: "—" }),
                                                                }),
                                                                _jsx("td", { style: { ...TD, color: C.textMuted, fontSize: 11 }, children: time ? new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" }),
                                                            ],
                                                        }, f.id ?? i);
                                                    }),
                                                }),
                                            ],
                                        }),
                                    }),
                                })
                            ),
                        ],
                    }),

                    // Side panel: Sentiment donut
                    _jsxs("div", {
                        style: { display: "flex", flexDirection: "column", gap: 16 },
                        children: [
                            _jsx(SentimentDonut, { calls: totalCallVol, puts: totalPutVol }),
                            !beginnerMode && flow.length > 0 && _jsxs(Card, {
                                style: { padding: "14px 16px" },
                                children: [
                                    _jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }, children: "Quick Stats" }),
                                    _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }, children: [
                                        _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: C.textMuted }, children: "Total contracts" }), _jsx("span", { style: { color: C.textPrimary, fontFamily: "monospace", fontWeight: 600 }, children: flow.length })] }),
                                        _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: C.textMuted }, children: "Calls" }), _jsx("span", { style: { color: C.green, fontFamily: "monospace", fontWeight: 600 }, children: callCount })] }),
                                        _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: C.textMuted }, children: "Puts" }), _jsx("span", { style: { color: C.red, fontFamily: "monospace", fontWeight: 600 }, children: putCount })] }),
                                        _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: C.textMuted }, children: "Unusual" }), _jsx("span", { style: { color: C.amber, fontFamily: "monospace", fontWeight: 600 }, children: unusualCount })] }),
                                    ]}),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
