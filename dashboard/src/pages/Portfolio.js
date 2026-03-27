import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import { getPortfolio, getPortfolioPerformance, executeTrade, getStressTest, getRebalanceAdvice } from "../api.js";
import { C, Card, SectionTitle, EmptyState, ErrorBanner, SkeletonBlock, useBeginnerMode, TH, TD, } from "../context.js";
const STRESS_SCENARIOS = [
    { id: "drop20", label: "Drop 20%" },
    { id: "drop40", label: "Drop 40%" },
    { id: "crisis2008", label: "2008 Crisis" },
    { id: "covid2020", label: "COVID 2020" },
    { id: "bear2022", label: "2022 Bear" },
];
function StressTestSection() {
    const { beginnerMode } = useBeginnerMode();
    const [scenario, setScenario] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function runTest(s) {
        setScenario(s);
        setLoading(true);
        setError(null);
        try {
            const data = await getStressTest(s);
            setResult(data);
        }
        catch (e) {
            setError(String(e));
            setResult(null);
        }
        finally {
            setLoading(false);
        }
    }
    const barData = result?.positions?.map((p) => ({
        name: p.instrument,
        current: Number(p.currentValue ?? 0),
        stressed: Number(p.stressedValue ?? 0),
        isGain: Number(p.stressedValue ?? 0) > Number(p.currentValue ?? 0),
    })) ?? [];
    return (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Stress Test" }), beginnerMode && (_jsxs("div", { style: {
                    padding: "10px 14px",
                    background: `${C.blue}0d`,
                    border: `1px solid ${C.blue}22`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                    marginBottom: 16,
                }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Stress testing" }), " simulates how your portfolio would perform during historical market crashes. It helps you understand your downside risk so you can hedge or rebalance proactively."] })), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }, children: STRESS_SCENARIOS.map((s) => (_jsx("button", { onClick: () => runTest(s.id), disabled: loading, style: {
                        padding: "7px 16px",
                        borderRadius: 8,
                        border: `1px solid ${scenario === s.id ? C.red + "88" : C.border}`,
                        background: scenario === s.id ? `${C.red}18` : "transparent",
                        color: scenario === s.id ? "#fca5a5" : C.textSecondary,
                        fontSize: 13,
                        fontWeight: scenario === s.id ? 600 : 400,
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.12s",
                    }, children: s.label }, s.id))) }), loading && _jsx(SkeletonBlock, { height: 200 }), error && !loading && (_jsx("div", { style: {
                    padding: "10px 14px",
                    background: `${C.red}1a`,
                    border: `1px solid ${C.red}44`,
                    borderRadius: 8,
                    color: "#fca5a5",
                    fontSize: 13,
                }, children: error })), result && !loading && (_jsxs(Card, { children: [_jsxs("div", { style: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }, children: [_jsxs("div", { style: { flex: 1, minWidth: 130 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Total Loss" }), _jsxs("div", { style: { color: C.red, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }, children: ["-$", Math.abs(result.totalLoss ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })] }), _jsxs("div", { style: { color: C.red, fontSize: 13, marginTop: 2 }, children: ["-", Math.abs(result.totalLossPct ?? 0).toFixed(1), "%"] })] }), result.worstPosition && (_jsxs("div", { style: {
                                    flex: 1,
                                    minWidth: 130,
                                    padding: "10px 14px",
                                    background: `${C.red}0d`,
                                    border: `1px solid ${C.red}22`,
                                    borderRadius: 8,
                                }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Worst Position" }), _jsx("div", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 14 }, children: result.worstPosition.instrument }), _jsxs("div", { style: { color: C.red, fontSize: 12 }, children: ["-", Math.abs(result.worstPosition.lossPct ?? 0).toFixed(1), "%"] })] })), result.bestHedge && (_jsxs("div", { style: {
                                    flex: 1,
                                    minWidth: 130,
                                    padding: "10px 14px",
                                    background: `${C.green}0d`,
                                    border: `1px solid ${C.green}22`,
                                    borderRadius: 8,
                                }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Best Hedge" }), _jsx("div", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 14 }, children: result.bestHedge.instrument }), _jsxs("div", { style: { color: C.green, fontSize: 12 }, children: ["+", Math.abs(result.bestHedge.gainPct ?? 0).toFixed(1), "%"] })] })), result.recoveryEstimate != null && (_jsxs("div", { style: {
                                    flex: 1,
                                    minWidth: 130,
                                    padding: "10px 14px",
                                    background: `${C.amber}0d`,
                                    border: `1px solid ${C.amber}22`,
                                    borderRadius: 8,
                                }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }, children: "Recovery Estimate" }), _jsxs("div", { style: { color: C.amber, fontWeight: 700, fontSize: 14 }, children: [result.recoveryEstimate, " months"] }), beginnerMode && _jsx("div", { style: { color: C.textMuted, fontSize: 11 }, children: "at avg annual return" })] }))] }), barData.length > 0 && (_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: barData, margin: { top: 5, right: 5, bottom: 20, left: 0 }, barCategoryGap: "20%", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", vertical: false }), _jsx(XAxis, { dataKey: "name", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: C.textMuted, fontSize: 10 }, axisLine: false, tickLine: false, width: 52, tickFormatter: (v) => `$${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 12 }, formatter: (val, name) => [
                                        `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
                                        name === "current" ? "Current" : "Stressed",
                                    ] }), _jsx(Bar, { dataKey: "current", name: "current", fill: C.blue + "77", radius: [3, 3, 0, 0] }), _jsx(Bar, { dataKey: "stressed", name: "stressed", radius: [3, 3, 0, 0], children: barData.map((entry, i) => (_jsx(Cell, { fill: entry.isGain ? C.green + "cc" : C.red + "cc" }, i))) })] }) }))] })), !result && !loading && !error && (_jsx("div", { style: {
                    padding: 30,
                    textAlign: "center",
                    color: C.textMuted,
                    fontSize: 13,
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                }, children: "Select a scenario above to simulate how your portfolio would perform." }))] }));
}
function fmt(n, decimals = 2) {
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtUSD(n) {
    return "$" + fmt(n);
}
function StatCard({ label, value, color, sub }) {
    return (_jsxs(Card, { style: { padding: "16px 20px" }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }, children: label }), _jsx("div", { style: { color: color ?? C.textPrimary, fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }, children: value }), sub && _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 4 }, children: sub })] }));
}
function CreatePortfolio({ onCreated }) {
    const [capital, setCapital] = useState("10000");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    async function handleCreate(e) {
        e.preventDefault();
        const amt = parseFloat(capital);
        if (isNaN(amt) || amt <= 0) {
            setError("Enter a valid amount");
            return;
        }
        setCreating(true);
        setError(null);
        try {
            await executeTrade("CASH", "DEPOSIT", amt);
            onCreated();
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setCreating(false);
        }
    }
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 20 }, children: "\uD83D\uDCBC" }), _jsx("h2", { style: { color: C.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 8 }, children: "Create Paper Portfolio" }), _jsx("p", { style: { color: C.textMuted, fontSize: 14, marginBottom: 32, textAlign: "center", maxWidth: 400 }, children: "Start with virtual capital to practice trading without risking real money." }), _jsx(Card, { style: { width: "100%", maxWidth: 380 }, children: _jsxs("form", { onSubmit: handleCreate, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Initial Capital (USD)" }), _jsx("input", { type: "number", value: capital, onChange: (e) => setCapital(e.target.value), min: "100", step: "100", style: {
                                        width: "100%",
                                        background: C.bg,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                        color: C.textPrimary,
                                        fontSize: 16,
                                        outline: "none",
                                        fontVariantNumeric: "tabular-nums",
                                    } })] }), error && (_jsx("div", { style: { color: C.red, fontSize: 12, marginBottom: 12 }, children: error })), _jsx("button", { type: "submit", disabled: creating, style: {
                                width: "100%",
                                background: creating ? "#334155" : C.blue,
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "11px",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: creating ? "not-allowed" : "pointer",
                                transition: "background 0.15s",
                            }, children: creating ? "Creating..." : "Create Portfolio" })] }) })] }));
}
function TradeForm({ onTraded }) {
    const [instrument, setInstrument] = useState("");
    const [action, setAction] = useState("BUY");
    const [qty, setQty] = useState("");
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        const q = parseFloat(qty);
        if (!instrument || isNaN(q) || q <= 0) {
            setStatus({ type: "error", msg: "Invalid instrument or quantity" });
            return;
        }
        setLoading(true);
        setStatus(null);
        try {
            const res = await executeTrade(instrument.toUpperCase(), action, q);
            setStatus({ type: "success", msg: res?.message ?? `${action} ${q} ${instrument.toUpperCase()} executed` });
            setInstrument("");
            setQty("");
            onTraded();
        }
        catch (err) {
            setStatus({ type: "error", msg: String(err) });
        }
        finally {
            setLoading(false);
        }
    }
    const inputStyle = {
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "9px 12px",
        color: C.textPrimary,
        fontSize: 13,
        outline: "none",
    };
    return (_jsxs(Card, { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 13, fontWeight: 600, marginBottom: 16 }, children: "Quick Trade" }), _jsxs("form", { onSubmit: handleSubmit, style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [_jsx("label", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "Instrument" }), _jsx("input", { type: "text", value: instrument, onChange: (e) => setInstrument(e.target.value), placeholder: "e.g. AAPL", required: true, style: { ...inputStyle, width: 130 } })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [_jsx("label", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "Action" }), _jsxs("select", { value: action, onChange: (e) => setAction(e.target.value), style: { ...inputStyle, width: 100 }, children: [_jsx("option", { value: "BUY", children: "BUY" }), _jsx("option", { value: "SELL", children: "SELL" }), _jsx("option", { value: "SHORT", children: "SHORT" })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [_jsx("label", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "Quantity" }), _jsx("input", { type: "number", value: qty, onChange: (e) => setQty(e.target.value), placeholder: "100", min: "1", step: "1", required: true, style: { ...inputStyle, width: 100 } })] }), _jsx("button", { type: "submit", disabled: loading, style: {
                            background: loading ? "#334155" : C.blue,
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 20px",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "background 0.15s",
                        }, children: loading ? "Executing..." : "Execute" })] }), status && (_jsx("div", { style: {
                    marginTop: 12,
                    padding: "9px 14px",
                    borderRadius: 8,
                    background: status.type === "success" ? `${C.green}1a` : `${C.red}1a`,
                    border: `1px solid ${status.type === "success" ? C.green + "44" : C.red + "44"}`,
                    color: status.type === "success" ? C.green : "#fca5a5",
                    fontSize: 13,
                }, children: status.msg }))] }));
}
function actionIcon(action) {
    if (action === "increase")
        return "↑";
    if (action === "reduce")
        return "↓";
    return "✂";
}
function actionColor(action) {
    if (action === "increase")
        return "#22c55e";
    if (action === "reduce")
        return "#ef4444";
    return "#f59e0b";
}
function RebalancingAdvisor() {
    const { beginnerMode } = useBeginnerMode();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applied, setApplied] = useState(new Set());
    function load() {
        setLoading(true);
        getRebalanceAdvice()
            .then((d) => { setData(d); setError(null); })
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);
    const actions = data?.actions ?? [];
    function applyDraft(ticker) {
        // Paper-trading only: save draft adjustment to localStorage
        const key = `rebalance_draft_${ticker}`;
        const existing = actions.find((a) => a.ticker === ticker);
        if (existing) {
            localStorage.setItem(key, JSON.stringify({ ticker, suggestedWeight: existing.suggestedWeight, appliedAt: new Date().toISOString() }));
            setApplied((prev) => new Set([...prev, ticker]));
        }
    }
    return (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, children: [_jsx(SectionTitle, { children: "Rebalancing Advice" }), _jsx("button", { onClick: load, style: { padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }, children: "\u21BB Refresh" })] }), beginnerMode && (_jsx("div", { style: { padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary, marginBottom: 12 }, children: "\uD83D\uDCDA Based on current market conditions, here is how to adjust your portfolio." })), loading && _jsx(SkeletonBlock, { height: 120 }), !loading && error && _jsx(ErrorBanner, { message: `Failed to load rebalancing advice: ${error}`, onRetry: load }), !loading && !error && actions.length === 0 && (_jsxs(Card, { style: { padding: "20px 24px", textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 24, marginBottom: 8 }, children: "\u2705" }), _jsx("div", { style: { color: C.textSecondary, fontSize: 13 }, children: "Your portfolio looks well-positioned for the current regime." })] })), !loading && !error && actions.length > 0 && (_jsxs(_Fragment, { children: [data?.summary && (_jsxs("div", { style: { padding: "10px 14px", background: `${C.border}55`, borderRadius: 8, fontSize: 12, color: C.textSecondary, marginBottom: 12 }, children: [data.summary, data.estimatedSharpeImprovement != null && (_jsxs("span", { style: { color: C.green, fontWeight: 700, marginLeft: 8 }, children: ["+", data.estimatedSharpeImprovement.toFixed(2), " Sharpe"] }))] })), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: actions.map((a) => {
                            const color = actionColor(a.action);
                            const isApplied = applied.has(a.ticker);
                            return (_jsx(Card, { style: { padding: "14px 18px", borderLeft: `3px solid ${color}` }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { style: { fontSize: 20, color, lineHeight: 1 }, children: actionIcon(a.action) }), _jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 15 }, children: a.ticker }), _jsx("span", { style: { color, background: `${color}1a`, border: `1px solid ${color}44`, padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }, children: a.action })] }), _jsxs("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 3 }, children: [a.currentWeight.toFixed(1), "% \u2192 ", _jsxs("span", { style: { color: C.textSecondary, fontWeight: 600 }, children: [a.suggestedWeight.toFixed(1), "%"] }), _jsx("span", { style: { marginLeft: 8, color: C.textMuted }, children: a.reason })] })] })] }), _jsx("button", { onClick: () => applyDraft(a.ticker), disabled: isApplied, style: {
                                                padding: "5px 14px",
                                                borderRadius: 7,
                                                border: `1px solid ${isApplied ? C.border : color + "66"}`,
                                                background: isApplied ? "transparent" : `${color}18`,
                                                color: isApplied ? C.textMuted : color,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: isApplied ? "default" : "pointer",
                                                transition: "all 0.15s",
                                            }, children: isApplied ? "✓ Applied (draft)" : "Apply" })] }) }, a.ticker));
                        }) })] }))] }));
}
export function Portfolio() {
    const { beginnerMode } = useBeginnerMode();
    const [portfolio, setPortfolio] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noPortfolio, setNoPortfolio] = useState(false);
    async function load() {
        try {
            const [port, perf] = await Promise.all([
                getPortfolio(),
                getPortfolioPerformance().catch(() => []),
            ]);
            if (!port || port.initialCapital == null) {
                setNoPortfolio(true);
            }
            else {
                setPortfolio(port);
                setNoPortfolio(false);
            }
            setPerformance(Array.isArray(perf) ? perf : []);
            setError(null);
        }
        catch {
            setNoPortfolio(true);
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
    const returnColor = portfolio && portfolio.totalReturn >= 0 ? C.green : C.red;
    const perfChartData = performance.map((p) => ({
        date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Portfolio: Number(p.portfolioValue),
        "S&P 500": p.spyValue != null ? Number(p.spyValue) : undefined,
    }));
    if (loading) {
        return (_jsxs("div", { style: { padding: 28 }, children: [_jsx(SkeletonBlock, { height: 40 }), _jsxs("div", { style: { marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }, children: [_jsx(SkeletonBlock, { height: 100 }), _jsx(SkeletonBlock, { height: 100 }), _jsx(SkeletonBlock, { height: 100 })] })] }));
    }
    if (noPortfolio) {
        return (_jsxs("div", { style: { padding: 28 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 28 }, children: "Portfolio" }), _jsx(CreatePortfolio, { onCreated: load })] }));
    }
    return (_jsxs("div", { style: { padding: 28 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Portfolio" }), _jsx("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: "Paper trading tracker" })] }), error && _jsx(ErrorBanner, { message: error, onRetry: load }), portfolio && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Overview" }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }, children: [_jsx(StatCard, { label: "Initial Capital", value: fmtUSD(portfolio.initialCapital), color: C.textSecondary }), _jsx(StatCard, { label: "Current Value", value: fmtUSD(portfolio.currentValue), color: C.textPrimary, sub: `${portfolio.holdings?.length ?? 0} position${portfolio.holdings?.length !== 1 ? "s" : ""}` }), _jsx(StatCard, { label: "Total Return", value: `${portfolio.totalReturn >= 0 ? "+" : ""}${fmt(portfolio.totalReturn)}%`, color: returnColor, sub: portfolio.totalReturnUSD != null
                                            ? `${portfolio.totalReturnUSD >= 0 ? "+" : ""}${fmtUSD(portfolio.totalReturnUSD)}`
                                            : undefined })] })] }), beginnerMode && (_jsxs("div", { style: {
                            padding: "10px 14px",
                            background: `${C.blue}0d`,
                            border: `1px solid ${C.blue}22`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: C.textSecondary,
                            marginBottom: 20,
                        }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Paper trading" }), " uses virtual money so you can practice without losing real funds. Your P&L shows how your picks would have performed if you had used real money."] })), _jsx(RebalancingAdvisor, {}), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Holdings" }), portfolio.holdings?.length > 0 ? (_jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Symbol" }), _jsx("th", { style: TH, children: "Qty" }), _jsx("th", { style: TH, children: "Entry Price" }), _jsx("th", { style: TH, children: "Current Price" }), _jsx("th", { style: TH, children: "P&L" }), portfolio.holdings.some((h) => h.weight != null) && (_jsx("th", { style: TH, children: "Weight %" }))] }) }), _jsx("tbody", { children: portfolio.holdings.map((h) => {
                                                    const pnlColor = h.pnl >= 0 ? C.green : C.red;
                                                    return (_jsxs("tr", { children: [_jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 700, fontSize: 14 }, children: h.instrument }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmt(h.quantity, 0) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(h.avgPrice) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(h.currentPrice) }), _jsxs("td", { style: TD, children: [_jsxs("div", { style: { color: pnlColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: [h.pnl >= 0 ? "+" : "", fmtUSD(h.pnl)] }), _jsxs("div", { style: { color: pnlColor, fontSize: 11, fontVariantNumeric: "tabular-nums" }, children: [h.pnlPct >= 0 ? "+" : "", fmt(h.pnlPct), "%"] })] }), portfolio.holdings.some((h2) => h2.weight != null) && (_jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: h.weight != null ? `${fmt(h.weight, 1)}%` : "—" }))] }, h.instrument));
                                                }) })] }) }) })) : (_jsx(EmptyState, { icon: "\uD83D\uDCCA", title: "No open positions", subtitle: "Execute a trade below to open your first position." }))] }), perfChartData.length > 1 && (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Performance vs S&P 500" }), _jsx(Card, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: perfChartData, margin: { top: 10, right: 10, bottom: 0, left: -10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", vertical: false }), _jsx(XAxis, { dataKey: "date", stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, interval: "preserveStartEnd" }), _jsx(YAxis, { stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (v) => `$${(v / 1000).toFixed(0)}k`, width: 42 }), _jsx(Tooltip, { contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 }, formatter: (val) => [fmtUSD(Number(val)), undefined] }), _jsx(Legend, { wrapperStyle: { color: C.textSecondary, fontSize: 12 } }), _jsx(Line, { type: "monotone", dataKey: "Portfolio", stroke: C.blue, dot: false, strokeWidth: 2 }), _jsx(Line, { type: "monotone", dataKey: "S&P 500", stroke: C.textMuted, dot: false, strokeWidth: 1.5, strokeDasharray: "5 3" })] }) }) })] })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Trade History" }), portfolio.trades?.length > 0 ? (_jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Date" }), _jsx("th", { style: TH, children: "Instrument" }), _jsx("th", { style: TH, children: "Action" }), _jsx("th", { style: TH, children: "Qty" }), _jsx("th", { style: TH, children: "Price" })] }) }), _jsx("tbody", { children: portfolio.trades.map((trade) => {
                                                    const ac = trade.action?.toUpperCase();
                                                    const actionColor = ac === "BUY" ? C.green : ac === "SHORT" ? C.red : "#f97316";
                                                    return (_jsxs("tr", { children: [_jsx("td", { style: { ...TD, color: C.textMuted }, children: new Date(trade.date).toLocaleDateString() }), _jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 600 }, children: trade.instrument }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                                        color: actionColor,
                                                                        background: `${actionColor}1a`,
                                                                        border: `1px solid ${actionColor}44`,
                                                                        padding: "2px 8px",
                                                                        borderRadius: 4,
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                    }, children: trade.action }) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmt(trade.quantity, 0) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: fmtUSD(trade.price) })] }, trade.id));
                                                }) })] }) }) })) : (_jsx(EmptyState, { icon: "\uD83D\uDCCB", title: "No trade history", subtitle: "Your executed trades will appear here." }))] }), (portfolio.holdings?.length ?? 0) > 0 && _jsx(StressTestSection, {}), _jsx("div", { style: { marginBottom: 28 }, children: _jsx(TradeForm, { onTraded: load }) })] }))] }));
}
