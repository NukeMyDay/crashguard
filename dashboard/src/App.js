import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, lazy, Suspense } from "react";
import { ExpertiseLevelProvider, useExpertise, C } from "./context.js";
import { ChatPanel } from "./components/ChatPanel.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { KeyboardHelp } from "./components/KeyboardHelp.js";
import { SystemStatusBar } from "./components/SystemStatusBar.js";
// Lazy-loaded pages for better initial load performance
const Overview = lazy(() => import("./pages/Overview.js").then((m) => ({ default: m.Overview })));
const Signals = lazy(() => import("./pages/Signals.js").then((m) => ({ default: m.Signals })));
const Scanner = lazy(() => import("./pages/Scanner.js").then((m) => ({ default: m.Scanner })));
const Strategies = lazy(() => import("./pages/Strategies.js").then((m) => ({ default: m.Strategies })));
const Portfolio = lazy(() => import("./pages/Portfolio.js").then((m) => ({ default: m.Portfolio })));
const History = lazy(() => import("./pages/History.js").then((m) => ({ default: m.History })));
const News = lazy(() => import("./pages/News.js").then((m) => ({ default: m.News })));
const Watchlist = lazy(() => import("./pages/Watchlist.js").then((m) => ({ default: m.Watchlist })));
const Settings = lazy(() => import("./pages/Settings.js").then((m) => ({ default: m.Settings })));
const Backtest = lazy(() => import("./pages/Backtest.js").then((m) => ({ default: m.Backtest })));
function PageLoadingFallback() {
    return (_jsx("div", { style: { padding: 40, display: "flex", justifyContent: "center", alignItems: "center", color: C.textMuted, fontSize: 13 }, children: "Loading\u2026" }));
}
function getHashRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const valid = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
    return valid.includes(hash) ? hash : "/";
}
function useHashRoute(setCommandPaletteOpen, setKeyboardHelpOpen) {
    const [route, setRoute] = useState(getHashRoute);
    useEffect(() => {
        function onHashChange() {
            setRoute(getHashRoute());
        }
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);
    // Global keyboard shortcuts
    useEffect(() => {
        function onKeyDown(e) {
            const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            // Ctrl+K / Cmd+K — command palette
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setCommandPaletteOpen(true);
                return;
            }
            if (inInput)
                return;
            const routes = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
            // 1–9,0 — navigate pages
            const idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx < routes.length) {
                navigate(routes[idx]);
                return;
            }
            switch (e.key) {
                case "/":
                    e.preventDefault();
                    setCommandPaletteOpen(true);
                    break;
                case "?":
                    setKeyboardHelpOpen(true);
                    break;
                case "r":
                case "R":
                    window.location.reload();
                    break;
                case "p":
                case "P":
                    window.print();
                    break;
                case "s":
                case "S": {
                    try {
                        const current = localStorage.getItem("mp_sound_alerts");
                        localStorage.setItem("mp_sound_alerts", current === "false" ? "true" : "false");
                    }
                    catch { }
                    break;
                }
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setCommandPaletteOpen, setKeyboardHelpOpen]);
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
function TopHeader({ route, onHelpOpen }) {
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
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 13 }, children: "MarketPulse" }), _jsx("span", { style: { color: "#2a3a50", fontSize: 13 }, children: "/" }), _jsx("span", { style: { color: C.textPrimary, fontSize: 13, fontWeight: 500 }, children: pageLabels[route] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }, children: [_jsx(MarketStatusBar, {}), _jsx(AutoRefreshIndicator, {}), _jsx(ExpertiseLevelSelector, {}), _jsx("button", { onClick: onHelpOpen, title: "Keyboard shortcuts (?)", style: {
                            background: "#1e293b",
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            color: C.textMuted,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }, children: "?" })] })] }));
}
// ---------------------------------------------------------------------------
// Page router
// ---------------------------------------------------------------------------
function PageContent({ route }) {
    let page;
    switch (route) {
        case "/":
            page = _jsx(Overview, {});
            break;
        case "/signals":
            page = _jsx(Signals, {});
            break;
        case "/scanner":
            page = _jsx(Scanner, {});
            break;
        case "/strategies":
            page = _jsx(Strategies, {});
            break;
        case "/portfolio":
            page = _jsx(Portfolio, {});
            break;
        case "/watchlist":
            page = _jsx(Watchlist, {});
            break;
        case "/history":
            page = _jsx(History, {});
            break;
        case "/news":
            page = _jsx(News, {});
            break;
        case "/backtest":
            page = _jsx(Backtest, {});
            break;
        case "/settings":
            page = _jsx(Settings, {});
            break;
        default:
            page = _jsx(Overview, {});
            break;
    }
    return _jsx(Suspense, { fallback: _jsx(PageLoadingFallback, {}), children: page });
}
// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
function AppInner() {
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
    const [route, navigate] = useHashRoute(setCommandPaletteOpen, setKeyboardHelpOpen);
    return (_jsxs("div", { style: {
            display: "flex",
            minHeight: "100vh",
            background: C.bg,
            color: C.textPrimary,
            fontFamily: "'Inter', system-ui, sans-serif",
        }, children: [_jsx(Sidebar, { route: route, navigate: navigate }), _jsxs("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [_jsx(TopHeader, { route: route, onHelpOpen: () => setKeyboardHelpOpen(true) }), _jsx("main", { style: { flex: 1, overflowY: "auto", overflowX: "hidden" }, children: _jsx(PageContent, { route: route }) }), _jsx(SystemStatusBar, {})] }), _jsx(CommandPalette, { open: commandPaletteOpen, onClose: () => setCommandPaletteOpen(false) }), _jsx(KeyboardHelp, { open: keyboardHelpOpen, onClose: () => setKeyboardHelpOpen(false) })] }));
}
function App() {
    return (_jsxs(ExpertiseLevelProvider, { children: [_jsx(AppInner, {}), _jsx(ChatPanel, {})] }));
}
export default App;
