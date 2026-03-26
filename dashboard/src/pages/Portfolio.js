import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import { getPortfolio, getPortfolioPerformance, executeTrade } from "../api.js";
function fmt(n, decimals = 2) {
    return n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
function fmtUSD(n) {
    return "$" + fmt(n);
}
function PnlCell({ pnl, pnlPct }) {
    const color = pnl >= 0 ? "#22c55e" : "#ef4444";
    return (_jsxs("div", { children: [_jsxs("div", { style: { color, fontWeight: 600, fontSize: 13 }, children: [pnl >= 0 ? "+" : "", fmtUSD(pnl)] }), _jsxs("div", { style: { color, fontSize: 11 }, children: [pnlPct >= 0 ? "+" : "", fmt(pnlPct), "%"] })] }));
}
const TH = {
    padding: "10px 14px",
    textAlign: "left",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};
const TD = {
    padding: "10px 14px",
    color: "#94a3b8",
    fontSize: 13,
    verticalAlign: "middle",
};
function TableCard({ children }) {
    return (_jsx("div", { style: {
            background: "#0f172a",
            borderRadius: 10,
            border: "1px solid #1e293b",
            overflow: "hidden",
        }, children: children }));
}
function SectionTitle({ children }) {
    return (_jsx("h2", { style: {
            fontSize: 16,
            fontWeight: 600,
            color: "#cbd5e1",
            marginBottom: 14,
            marginTop: 0,
        }, children: children }));
}
export function Portfolio() {
    const [portfolio, setPortfolio] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Trade form state
    const [tradeInstrument, setTradeInstrument] = useState("");
    const [tradeAction, setTradeAction] = useState("BUY");
    const [tradeQty, setTradeQty] = useState("");
    const [tradeStatus, setTradeStatus] = useState(null);
    const [tradeLoading, setTradeLoading] = useState(false);
    async function load() {
        try {
            const [port, perf] = await Promise.all([
                getPortfolio(),
                getPortfolioPerformance().catch(() => []),
            ]);
            setPortfolio(port);
            setPerformance(Array.isArray(perf) ? perf : []);
            setError(null);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);
    async function handleTrade(e) {
        e.preventDefault();
        if (!tradeInstrument || !tradeQty)
            return;
        const qty = parseFloat(tradeQty);
        if (isNaN(qty) || qty <= 0) {
            setTradeStatus({ type: "error", message: "Invalid quantity" });
            return;
        }
        setTradeLoading(true);
        setTradeStatus(null);
        try {
            const result = await executeTrade(tradeInstrument.toUpperCase(), tradeAction, qty);
            setTradeStatus({
                type: "success",
                message: result?.message ??
                    `${tradeAction} ${qty} ${tradeInstrument.toUpperCase()} executed successfully`,
            });
            setTradeInstrument("");
            setTradeQty("");
            load();
        }
        catch (e) {
            setTradeStatus({ type: "error", message: String(e) });
        }
        finally {
            setTradeLoading(false);
        }
    }
    const returnColor = portfolio != null && portfolio.totalReturn >= 0 ? "#22c55e" : "#ef4444";
    const perfChartData = performance.map((p) => ({
        date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Portfolio: Number(p.portfolioValue),
        SPY: p.spyValue != null ? Number(p.spyValue) : undefined,
    }));
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "Portfolio" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Paper trading tracker" })] }), loading && _jsx("p", { style: { color: "#64748b" }, children: "Loading portfolio..." }), error && (_jsxs("div", { style: {
                    background: "#0f172a",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    padding: 20,
                    color: "#f87171",
                    marginBottom: 24,
                }, children: ["Portfolio data unavailable: ", error] })), portfolio && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Summary" }), _jsx("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                    gap: 16,
                                }, children: [
                                    {
                                        label: "Initial Capital",
                                        value: fmtUSD(portfolio.initialCapital),
                                        color: "#94a3b8",
                                    },
                                    {
                                        label: "Current Value",
                                        value: fmtUSD(portfolio.currentValue),
                                        color: "#e2e8f0",
                                    },
                                    {
                                        label: "Total Return",
                                        value: `${portfolio.totalReturn >= 0 ? "+" : ""}${fmt(portfolio.totalReturn)}%`,
                                        color: returnColor,
                                    },
                                ].map((stat) => (_jsxs("div", { style: {
                                        background: "#0f172a",
                                        border: "1px solid #1e293b",
                                        borderRadius: 10,
                                        padding: "18px 20px",
                                    }, children: [_jsx("div", { style: {
                                                color: "#64748b",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                marginBottom: 8,
                                            }, children: stat.label }), _jsx("div", { style: {
                                                color: stat.color,
                                                fontSize: 22,
                                                fontWeight: 700,
                                                fontVariantNumeric: "tabular-nums",
                                            }, children: stat.value })] }, stat.label))) })] }), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Holdings" }), portfolio.holdings?.length > 0 ? (_jsx(TableCard, { children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Instrument" }), _jsx("th", { style: TH, children: "Qty" }), _jsx("th", { style: TH, children: "Avg Price" }), _jsx("th", { style: TH, children: "Current Price" }), _jsx("th", { style: TH, children: "P&L" })] }) }), _jsx("tbody", { children: portfolio.holdings.map((h, i) => (_jsxs("tr", { style: {
                                                    borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                                                    background: i % 2 === 0 ? "transparent" : "#0a1120",
                                                }, children: [_jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: h.instrument }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmt(h.quantity, 0) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(h.avgPrice) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(h.currentPrice) }), _jsx("td", { style: TD, children: _jsx(PnlCell, { pnl: h.pnl, pnlPct: h.pnlPct }) })] }, h.instrument))) })] }) })) : (_jsx("div", { style: {
                                    background: "#0f172a",
                                    border: "1px solid #1e293b",
                                    borderRadius: 10,
                                    padding: 32,
                                    textAlign: "center",
                                    color: "#475569",
                                    fontSize: 14,
                                }, children: "No open holdings" }))] }), perfChartData.length > 1 && (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Performance" }), _jsx("div", { style: {
                                    background: "#0f172a",
                                    border: "1px solid #1e293b",
                                    borderRadius: 10,
                                    padding: 20,
                                }, children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: perfChartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1e293b" }), _jsx(XAxis, { dataKey: "date", stroke: "#475569", tick: { fontSize: 11 } }), _jsx(YAxis, { stroke: "#475569", tick: { fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                                    background: "#0f172a",
                                                    border: "1px solid #334155",
                                                    color: "#e2e8f0",
                                                    fontSize: 12,
                                                }, formatter: (val) => [fmtUSD(Number(val)), undefined] }), _jsx(Legend, { wrapperStyle: { color: "#94a3b8", fontSize: 12 } }), _jsx(Line, { type: "monotone", dataKey: "Portfolio", stroke: "#6366f1", dot: false, strokeWidth: 2 }), _jsx(Line, { type: "monotone", dataKey: "SPY", stroke: "#94a3b8", dot: false, strokeWidth: 1.5, strokeDasharray: "4 2" })] }) }) })] })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Trade History" }), portfolio.trades?.length > 0 ? (_jsx(TableCard, { children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Date" }), _jsx("th", { style: TH, children: "Instrument" }), _jsx("th", { style: TH, children: "Action" }), _jsx("th", { style: TH, children: "Qty" }), _jsx("th", { style: TH, children: "Price" })] }) }), _jsx("tbody", { children: portfolio.trades.map((trade, i) => {
                                                const actionColor = trade.action === "BUY"
                                                    ? "#22c55e"
                                                    : trade.action === "SHORT"
                                                        ? "#ef4444"
                                                        : "#f97316";
                                                return (_jsxs("tr", { style: {
                                                        borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                                                        background: i % 2 === 0 ? "transparent" : "#0a1120",
                                                    }, children: [_jsx("td", { style: { ...TD, color: "#64748b" }, children: new Date(trade.date).toLocaleDateString() }), _jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: trade.instrument }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                                    color: actionColor,
                                                                    fontWeight: 700,
                                                                    fontSize: 11,
                                                                }, children: trade.action }) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmt(trade.quantity, 0) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(trade.price) })] }, trade.id));
                                            }) })] }) })) : (_jsx("div", { style: {
                                    background: "#0f172a",
                                    border: "1px solid #1e293b",
                                    borderRadius: 10,
                                    padding: 32,
                                    textAlign: "center",
                                    color: "#475569",
                                    fontSize: 14,
                                }, children: "No trade history" }))] })] })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Quick Trade" }), _jsxs("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 24,
                        }, children: [_jsxs("form", { onSubmit: handleTrade, style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Instrument" }), _jsx("input", { type: "text", value: tradeInstrument, onChange: (e) => setTradeInstrument(e.target.value), placeholder: "e.g. AAPL", required: true, style: {
                                                    background: "#0a0e1a",
                                                    border: "1px solid #1e293b",
                                                    borderRadius: 6,
                                                    padding: "8px 12px",
                                                    color: "#e2e8f0",
                                                    fontSize: 13,
                                                    outline: "none",
                                                    width: 140,
                                                } })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Action" }), _jsxs("select", { value: tradeAction, onChange: (e) => setTradeAction(e.target.value), style: {
                                                    background: "#0a0e1a",
                                                    border: "1px solid #1e293b",
                                                    borderRadius: 6,
                                                    padding: "8px 12px",
                                                    color: "#e2e8f0",
                                                    fontSize: 13,
                                                    outline: "none",
                                                    width: 100,
                                                }, children: [_jsx("option", { value: "BUY", children: "BUY" }), _jsx("option", { value: "SELL", children: "SELL" }), _jsx("option", { value: "SHORT", children: "SHORT" })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Quantity" }), _jsx("input", { type: "number", value: tradeQty, onChange: (e) => setTradeQty(e.target.value), placeholder: "100", min: "1", step: "1", required: true, style: {
                                                    background: "#0a0e1a",
                                                    border: "1px solid #1e293b",
                                                    borderRadius: 6,
                                                    padding: "8px 12px",
                                                    color: "#e2e8f0",
                                                    fontSize: 13,
                                                    outline: "none",
                                                    width: 100,
                                                } })] }), _jsx("button", { type: "submit", disabled: tradeLoading, style: {
                                            background: tradeLoading ? "#334155" : "#6366f1",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 6,
                                            padding: "9px 20px",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: tradeLoading ? "not-allowed" : "pointer",
                                            transition: "background 0.15s",
                                        }, children: tradeLoading ? "Executing..." : "Execute" })] }), tradeStatus && (_jsx("div", { style: {
                                    marginTop: 14,
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    background: tradeStatus.type === "success" ? "#22c55e1a" : "#ef44441a",
                                    border: `1px solid ${tradeStatus.type === "success" ? "#22c55e44" : "#ef444444"}`,
                                    color: tradeStatus.type === "success" ? "#22c55e" : "#f87171",
                                    fontSize: 13,
                                }, children: tradeStatus.message }))] })] })] }));
}
