import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Overview } from "./pages/Overview.js";
import { Signals } from "./pages/Signals.js";
import { Scanner } from "./pages/Scanner.js";
import { Strategies } from "./pages/Strategies.js";
import { Portfolio } from "./pages/Portfolio.js";
import { History } from "./pages/History.js";
import { News } from "./pages/News.js";
import { Watchlist } from "./pages/Watchlist.js";
import { Settings } from "./pages/Settings.js";
import { Backtest } from "./pages/Backtest.js";
import { ExpertiseLevelProvider, useExpertise, C } from "./context.js";
import { ChatPanel } from "./components/ChatPanel.js";
function getHashRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const valid = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
    return valid.includes(hash) ? hash : "/";
}
function useHashRoute() {
    const [route, setRoute] = useState(getHashRoute);
    useEffect(() => {
        function onHashChange() {
            setRoute(getHashRoute());
        }
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);
    // Keyboard shortcuts: 1–7
    useEffect(() => {
        function onKeyDown(e) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            const routes = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
            const idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx < routes.length) {
                navigate(routes[idx]);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    function navigate(r) {
        window.location.hash = r;
        setRoute(r);
    }
    return [route, navigate];
}
const NAV_ITEMS = [
    { route: "/", label: "Overview", icon: "📊", shortcut: "1" },
    { route: "/signals", label: "Signals", icon: "📈", shortcut: "2" },
    { route: "/scanner", label: "Scanner", icon: "🔍", shortcut: "3" },
    { route: "/strategies", label: "Strategies", icon: "🎯", shortcut: "4" },
    { route: "/portfolio", label: "Portfolio", icon: "💼", shortcut: "5" },
    { route: "/watchlist", label: "Watchlist", icon: "👁", shortcut: "6" },
    { route: "/history", label: "History", icon: "📅", shortcut: "7" },
    { route: "/news", label: "News", icon: "📰", shortcut: "8" },
    { route: "/backtest", label: "Backtest", icon: "⏱️", shortcut: "9" },
    { route: "/settings", label: "Settings", icon: "⚙️", shortcut: "0" },
];
const MARKETS = [
    { label: "US", tz: "EST", openHour: 14, closeHour: 21, days: [1, 2, 3, 4, 5] }, // 9:30–16:00 EST = 14:30–21:00 UTC approx
    { label: "EU", tz: "CET", openHour: 8, closeHour: 16, days: [1, 2, 3, 4, 5] }, // 9:00–17:00 CET = 8:00–16:00 UTC
    { label: "AS", tz: "JST", openHour: 0, closeHour: 6, days: [1, 2, 3, 4, 5] }, // 9:00–15:00 JST = 0:00–6:00 UTC
];
function getMarketState(market, now) {
    const day = now.getUTCDay(); // 0=Sun, 1=Mon..5=Fri, 6=Sat
    const hour = now.getUTCHours();
    if (!market.days.includes(day))
        return "closed";
    if (hour >= market.openHour && hour < market.closeHour)
        return "open";
    if (hour >= market.openHour - 1 && hour < market.openHour)
        return "pre";
    return "closed";
}
function MarketStatusBar() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(t);
    }, []);
    const utcTime = now.toUTCString().slice(17, 22) + " UTC";
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11, fontFamily: "monospace" }, children: utcTime }), _jsx("span", { style: { color: "#1e293b" }, children: "|" }), MARKETS.map((m) => {
                const state = getMarketState(m, now);
                const color = state === "open" ? C.green : state === "pre" ? C.amber : "#2a3a50";
                const label = state === "open" ? "Open" : state === "pre" ? "Pre" : "Closed";
                return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: {
                                width: 5, height: 5, borderRadius: "50%", background: color,
                                boxShadow: state === "open" ? `0 0 5px ${color}` : "none",
                            } }), _jsxs("span", { style: { color: state === "open" ? C.textSecondary : "#2a3a50", fontSize: 11, fontWeight: state === "open" ? 600 : 400 }, children: [m.label, _jsx("span", { style: { color, marginLeft: 2, fontSize: 10 }, children: label })] })] }, m.label));
            })] }));
}
// ---------------------------------------------------------------------------
// Auto-refresh header
// ---------------------------------------------------------------------------
function AutoRefreshIndicator() {
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [lastUpdated] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [lastUpdated]);
    const status = secondsAgo > 300 ? "error" : secondsAgo > 90 ? "stale" : "live";
    const dotColor = status === "live" ? C.green : status === "stale" ? C.amber : C.red;
    const label = secondsAgo < 5
        ? "Just updated"
        : secondsAgo < 60
            ? `${secondsAgo}s ago`
            : `${Math.floor(secondsAgo / 60)}m ago`;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("div", { style: {
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: dotColor,
                    boxShadow: status === "live" ? `0 0 6px ${dotColor}` : "none",
                } }), _jsxs("span", { style: { color: C.textMuted, fontSize: 12 }, children: [status === "live" ? "Live" : status === "stale" ? "Stale" : "Error", " \u00B7 ", label] })] }));
}
// ---------------------------------------------------------------------------
// Expertise Level Selector (3-way segmented control)
// ---------------------------------------------------------------------------
const EXPERTISE_OPTIONS = [
    { value: "beginner", icon: "🎓", label: "Beginner" },
    { value: "intermediate", icon: "📊", label: "Intermediate" },
    { value: "professional", icon: "⚡", label: "Professional" },
];
function ExpertiseLevelSelector() {
    const { level, setLevel } = useExpertise();
    return (_jsx("div", { style: {
            display: "flex",
            background: "#0d1424",
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: 2,
            gap: 2,
        }, children: EXPERTISE_OPTIONS.map((opt) => {
            const isActive = level === opt.value;
            return (_jsxs("button", { onClick: () => setLevel(opt.value), title: opt.label, style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 18,
                    border: "none",
                    background: isActive ? C.blue + "33" : "transparent",
                    color: isActive ? C.blue : C.textMuted,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                }, children: [_jsx("span", { children: opt.icon }), _jsx("span", { className: "expertise-label", children: opt.label })] }, opt.value));
        }) }));
}
// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ route, navigate }) {
    const [hovered, setHovered] = useState(null);
    return (_jsxs("aside", { style: {
            width: 220,
            minWidth: 220,
            background: "#080c13",
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            position: "sticky",
            top: 0,
            flexShrink: 0,
        }, children: [_jsx("div", { style: { padding: "20px 18px 16px", borderBottom: `1px solid ${C.border}` }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: {
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 17,
                                flexShrink: 0,
                            }, children: "\uD83D\uDCE1" }), _jsxs("div", { children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }, children: "MarketPulse" }), _jsx("div", { style: { color: C.textMuted, fontSize: 11 }, children: "Crash Monitor" })] })] }) }), _jsx("nav", { style: { flex: 1, padding: "10px 8px", overflowY: "auto" }, children: NAV_ITEMS.map((item) => {
                    const isActive = route === item.route;
                    const isHov = hovered === item.route;
                    return (_jsxs("button", { onClick: () => navigate(item.route), onMouseEnter: () => setHovered(item.route), onMouseLeave: () => setHovered(null), style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: isActive ? `1px solid ${C.blue}33` : "1px solid transparent",
                            background: isActive ? `${C.blue}18` : isHov ? "#ffffff08" : "transparent",
                            color: isActive ? C.blue : isHov ? C.textSecondary : "#64748b",
                            cursor: "pointer",
                            textAlign: "left",
                            fontWeight: isActive ? 600 : 400,
                            fontSize: 14,
                            transition: "all 0.12s ease",
                            marginBottom: 2,
                        }, children: [_jsx("span", { style: { fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }, children: item.icon }), _jsx("span", { style: { flex: 1 }, children: item.label }), !isActive && (_jsx("span", { style: { color: "#2a3a50", fontSize: 10, fontWeight: 500 }, children: item.shortcut })), isActive && (_jsx("div", { style: {
                                    width: 4,
                                    height: 16,
                                    borderRadius: 2,
                                    background: C.blue,
                                    flexShrink: 0,
                                } }))] }, item.route));
                }) }), _jsxs("div", { style: { padding: "12px 16px", borderTop: `1px solid ${C.border}` }, children: [_jsx("div", { style: { color: "#1e293b", fontSize: 11 }, children: "MarketPulse v1.0" }), _jsx("div", { style: { color: "#131d2e", fontSize: 10, marginTop: 1 }, children: "Press 1\u20139 to navigate" })] })] }));
}
// ---------------------------------------------------------------------------
// Top header
// ---------------------------------------------------------------------------
function TopHeader({ route }) {
    const pageLabels = {
        "/": "Overview",
        "/signals": "Signals",
        "/scanner": "Market Scanner",
        "/strategies": "Strategies",
        "/portfolio": "Portfolio",
        "/watchlist": "Watchlist",
        "/history": "Historical Analysis",
        "/news": "News Feed",
        "/backtest": "Backtesting Engine",
        "/settings": "Settings",
    };
    return (_jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: "#0b0f18",
            flexShrink: 0,
            gap: 16,
            flexWrap: "wrap",
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 13 }, children: "MarketPulse" }), _jsx("span", { style: { color: "#2a3a50", fontSize: 13 }, children: "/" }), _jsx("span", { style: { color: C.textPrimary, fontSize: 13, fontWeight: 500 }, children: pageLabels[route] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }, children: [_jsx(MarketStatusBar, {}), _jsx(AutoRefreshIndicator, {}), _jsx(ExpertiseLevelSelector, {})] })] }));
}
// ---------------------------------------------------------------------------
// Page router
// ---------------------------------------------------------------------------
function PageContent({ route }) {
    switch (route) {
        case "/":
            return _jsx(Overview, {});
        case "/signals":
            return _jsx(Signals, {});
        case "/scanner":
            return _jsx(Scanner, {});
        case "/strategies":
            return _jsx(Strategies, {});
        case "/portfolio":
            return _jsx(Portfolio, {});
        case "/watchlist":
            return _jsx(Watchlist, {});
        case "/history":
            return _jsx(History, {});
        case "/news":
            return _jsx(News, {});
        case "/backtest":
            return _jsx(Backtest, {});
        case "/settings":
            return _jsx(Settings, {});
        default:
            return _jsx(Overview, {});
    }
}
// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
function AppInner() {
    const [route, navigate] = useHashRoute();
    return (_jsxs("div", { style: {
            display: "flex",
            minHeight: "100vh",
            background: C.bg,
            color: C.textPrimary,
            fontFamily: "'Inter', system-ui, sans-serif",
        }, children: [_jsx(Sidebar, { route: route, navigate: navigate }), _jsxs("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [_jsx(TopHeader, { route: route }), _jsx("main", { style: { flex: 1, overflowY: "auto", overflowX: "hidden" }, children: _jsx(PageContent, { route: route }) })] })] }));
}
function App() {
    return (_jsxs(ExpertiseLevelProvider, { children: [_jsx(AppInner, {}), _jsx(ChatPanel, {})] }));
}
export default App;
