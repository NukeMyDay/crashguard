import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../context.js";
const TYPE_ICONS = {
    page: "📄",
    indicator: "📊",
    signal: "📈",
    command: "⚡",
};
// Built-in page navigations
const PAGE_RESULTS = [
    { id: "page-overview", type: "page", icon: "📊", title: "Overview", subtitle: "Dashboard · Crash Score" },
    { id: "page-signals", type: "page", icon: "📈", title: "Signals", subtitle: "Trading signals" },
    { id: "page-scanner", type: "page", icon: "🔍", title: "Scanner", subtitle: "Market scanner" },
    { id: "page-strategies", type: "page", icon: "🎯", title: "Strategies", subtitle: "Strategy comparison" },
    { id: "page-portfolio", type: "page", icon: "💼", title: "Portfolio", subtitle: "Rebalancing advisor" },
    { id: "page-watchlist", type: "page", icon: "👁", title: "Watchlist", subtitle: "Symbol tracking" },
    { id: "page-history", type: "page", icon: "📅", title: "History", subtitle: "Historical analysis" },
    { id: "page-news", type: "page", icon: "📰", title: "News", subtitle: "News feed" },
    { id: "page-backtest", type: "page", icon: "⏱️", title: "Backtest", subtitle: "Backtesting engine" },
    { id: "page-settings", type: "page", icon: "⚙️", title: "Settings", subtitle: "Configuration" },
];
const PAGE_ROUTES = {
    "page-overview": "/",
    "page-signals": "/signals",
    "page-scanner": "/scanner",
    "page-strategies": "/strategies",
    "page-portfolio": "/portfolio",
    "page-watchlist": "/watchlist",
    "page-history": "/history",
    "page-news": "/news",
    "page-backtest": "/backtest",
    "page-settings": "/settings",
};
// Built-in commands (> prefix)
const COMMANDS = [
    { id: "cmd-export-csv", type: "command", icon: "📥", title: "Export CSV", subtitle: "Download indicator data" },
    { id: "cmd-dark-pool", type: "command", icon: "🌑", title: "Dark Pool", subtitle: "View dark pool prints" },
    { id: "cmd-backtest-2008", type: "command", icon: "📉", title: "Backtest 2008", subtitle: "Simulate 2008 crash" },
    { id: "cmd-backtest-2020", type: "command", icon: "📉", title: "Backtest 2020", subtitle: "Simulate 2020 crash" },
    { id: "cmd-backtest-2022", type: "command", icon: "📉", title: "Backtest 2022", subtitle: "Simulate 2022 drawdown" },
    { id: "cmd-sound-on", type: "command", icon: "🔔", title: "Sound Alerts On", subtitle: "Enable audio notifications" },
    { id: "cmd-sound-off", type: "command", icon: "🔕", title: "Sound Alerts Off", subtitle: "Disable audio notifications" },
    { id: "cmd-refresh", type: "command", icon: "🔄", title: "Refresh Data", subtitle: "Force reload all data" },
];
const MAX_RECENT = 5;
const RECENT_KEY = "mp_cmd_recent";
function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    }
    catch {
        return [];
    }
}
function saveRecentSearch(query) {
    try {
        const existing = getRecentSearches().filter((q) => q !== query);
        const updated = [query, ...existing].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    }
    catch { }
}
export function CommandPalette({ open, onClose }) {
    const [query, setQuery] = useState("");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [recentSearches, setRecentSearches] = useState([]);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    useEffect(() => {
        if (open) {
            setQuery("");
            setSelectedIdx(0);
            setRecentSearches(getRecentSearches());
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);
    function navigate(route) {
        window.location.hash = route;
        onClose();
    }
    function handleCommandAction(id) {
        switch (id) {
            case "cmd-export-csv":
                navigate("/signals");
                break;
            case "cmd-dark-pool":
                navigate("/scanner");
                break;
            case "cmd-backtest-2008":
            case "cmd-backtest-2020":
            case "cmd-backtest-2022":
                navigate("/backtest");
                break;
            case "cmd-sound-on":
                try {
                    localStorage.setItem("mp_sound_alerts", "true");
                }
                catch { }
                onClose();
                break;
            case "cmd-sound-off":
                try {
                    localStorage.setItem("mp_sound_alerts", "false");
                }
                catch { }
                onClose();
                break;
            case "cmd-refresh":
                window.location.reload();
                break;
        }
    }
    const buildResults = useCallback(() => {
        const q = query.trim().toLowerCase();
        const isCommand = q.startsWith(">");
        const searchTerm = isCommand ? q.slice(1).trim() : q;
        if (isCommand) {
            return COMMANDS.filter((c) => !searchTerm || c.title.toLowerCase().includes(searchTerm) || (c.subtitle ?? "").toLowerCase().includes(searchTerm)).map((c) => ({
                ...c,
                action: () => handleCommandAction(c.id),
            }));
        }
        if (!q) {
            // Show recent + top pages
            return PAGE_RESULTS.slice(0, 5).map((p) => ({
                ...p,
                action: () => navigate(PAGE_ROUTES[p.id]),
            }));
        }
        const matchedPages = PAGE_RESULTS.filter((p) => p.title.toLowerCase().includes(q) || (p.subtitle ?? "").toLowerCase().includes(q)).map((p) => ({
            ...p,
            action: () => navigate(PAGE_ROUTES[p.id]),
        }));
        return matchedPages.slice(0, 8);
    }, [query]);
    const results = buildResults();
    useEffect(() => {
        setSelectedIdx(0);
    }, [query]);
    function handleKeyDown(e) {
        if (e.key === "Escape") {
            onClose();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(i - 1, 0));
        }
        else if (e.key === "Enter") {
            e.preventDefault();
            if (results[selectedIdx]) {
                if (query.trim())
                    saveRecentSearch(query.trim());
                results[selectedIdx].action();
            }
        }
    }
    function handleResultClick(result) {
        if (query.trim())
            saveRecentSearch(query.trim());
        result.action();
    }
    if (!open)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { onClick: onClose, style: {
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    zIndex: 9000,
                    backdropFilter: "blur(2px)",
                } }), _jsxs("div", { style: {
                    position: "fixed",
                    top: "15%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "min(560px, 90vw)",
                    zIndex: 9001,
                    background: "#0d1424",
                    border: `1px solid ${C.blue}55`,
                    borderRadius: 14,
                    boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px ${C.blue}22`,
                    overflow: "hidden",
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "14px 16px",
                            borderBottom: `1px solid ${C.border}`,
                        }, children: [_jsx("span", { style: { fontSize: 16, flexShrink: 0 }, children: "\uD83D\uDD0D" }), _jsx("input", { ref: inputRef, value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: handleKeyDown, placeholder: "Search pages, indicators, signals\u2026 or type > for commands", style: {
                                    flex: 1,
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    color: C.textPrimary,
                                    fontSize: 15,
                                    fontFamily: "inherit",
                                } }), query && (_jsx("button", { onClick: () => setQuery(""), style: {
                                    background: "none",
                                    border: "none",
                                    color: C.textMuted,
                                    cursor: "pointer",
                                    fontSize: 16,
                                    lineHeight: 1,
                                    padding: 0,
                                }, children: "\u00D7" })), _jsx("span", { style: {
                                    color: C.textMuted,
                                    fontSize: 11,
                                    background: "#1e293b",
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 4,
                                    padding: "2px 6px",
                                    flexShrink: 0,
                                }, children: "ESC" })] }), !query && recentSearches.length > 0 && (_jsxs("div", { style: { padding: "8px 12px 4px", borderBottom: `1px solid ${C.border}` }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }, children: "Recent" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: recentSearches.map((r) => (_jsx("button", { onClick: () => setQuery(r), style: {
                                        background: "#1e293b",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 6,
                                        color: C.textSecondary,
                                        fontSize: 12,
                                        padding: "3px 8px",
                                        cursor: "pointer",
                                    }, children: r }, r))) })] })), _jsx("div", { ref: listRef, style: { maxHeight: 360, overflowY: "auto" }, children: results.length === 0 ? (_jsxs("div", { style: { padding: "24px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }, children: ["No results for \"", query, "\""] })) : (results.map((result, idx) => {
                            const isSelected = idx === selectedIdx;
                            return (_jsxs("div", { onClick: () => handleResultClick(result), onMouseEnter: () => setSelectedIdx(idx), style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 16px",
                                    cursor: "pointer",
                                    background: isSelected ? `${C.blue}18` : "transparent",
                                    borderLeft: isSelected ? `2px solid ${C.blue}` : "2px solid transparent",
                                    transition: "background 0.1s",
                                }, children: [_jsx("span", { style: { fontSize: 18, flexShrink: 0 }, children: result.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { color: C.textPrimary, fontSize: 13, fontWeight: isSelected ? 600 : 400 }, children: result.title }), result.subtitle && (_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 1 }, children: result.subtitle }))] }), _jsx("span", { style: {
                                            color: C.textMuted,
                                            fontSize: 10,
                                            background: "#1e293b",
                                            borderRadius: 4,
                                            padding: "1px 6px",
                                            border: `1px solid ${C.border}`,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                        }, children: result.type })] }, result.id));
                        })) }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 16px",
                            borderTop: `1px solid ${C.border}`,
                        }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "\u2191\u2193 Navigate \u00B7 Enter Select \u00B7 ESC Close" }), _jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: ["Type ", _jsx("strong", { style: { color: C.textSecondary }, children: ">" }), " for commands"] })] })] })] }));
}
