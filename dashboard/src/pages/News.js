import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { getNews } from "../api.js";
import { C, EmptyState, ErrorBanner, SkeletonBlock, Badge, useBeginnerMode, } from "../context.js";
const SENTIMENT_COLORS = {
    bullish: C.green,
    bearish: C.red,
    neutral: C.amber,
};
const SENTIMENT_LABELS = {
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral",
};
function timeAgo(ts) {
    if (!ts)
        return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return "just now";
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
function getRecencyGroup(ts) {
    if (!ts)
        return "earlier";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60 * 60000)
        return "last-hour";
    if (diff < 24 * 60 * 60000)
        return "today";
    return "earlier";
}
const GROUP_LABELS = {
    "last-hour": "Last Hour",
    today: "Today",
    earlier: "Earlier",
};
const GROUP_ORDER = ["last-hour", "today", "earlier"];
function NewsCard({ item, tickerFilter, onTickerClick }) {
    const [hovered, setHovered] = useState(false);
    const sentiment = item.sentiment?.toLowerCase();
    const sentimentColor = sentiment ? (SENTIMENT_COLORS[sentiment] ?? C.textMuted) : null;
    const sentimentLabel = sentiment ? (SENTIMENT_LABELS[sentiment] ?? sentiment) : null;
    const content = (_jsxs("div", { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            background: hovered ? "#131e2e" : C.card,
            border: `1px solid ${C.border}`,
            borderLeft: sentimentColor ? `3px solid ${sentimentColor}` : `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px",
            cursor: item.url ? "pointer" : "default",
            transition: "border-color 0.12s, background 0.12s",
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }, children: [_jsx("p", { style: { color: C.textPrimary, fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5, flex: 1 }, children: item.headline }), sentimentColor && sentimentLabel && (_jsx(Badge, { label: sentimentLabel, color: sentimentColor, style: { flexShrink: 0, marginTop: 2 } }))] }), item.summary && (_jsx("p", { style: { color: C.textSecondary, fontSize: 12, margin: "0 0 10px", lineHeight: 1.6 }, children: item.summary })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [item.source && (_jsx("span", { style: { color: C.textMuted, fontSize: 11, fontWeight: 500 }, children: item.source })), item.publishedAt && (_jsx("span", { style: { color: "#2a3a50", fontSize: 11 }, children: "\u00B7" })), item.publishedAt && (_jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: timeAgo(item.publishedAt) })), (item.tickers ?? []).length > 0 && (_jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginLeft: "auto" }, children: (item.tickers ?? []).map((t) => (_jsx("button", { onClick: (e) => { e.stopPropagation(); onTickerClick(tickerFilter === t ? "" : t); }, style: {
                                padding: "1px 8px",
                                borderRadius: 4,
                                border: `1px solid ${tickerFilter === t ? C.blue + "88" : C.border}`,
                                background: tickerFilter === t ? `${C.blue}22` : "#1e293b",
                                color: tickerFilter === t ? C.blue : C.textSecondary,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "monospace",
                                letterSpacing: "0.02em",
                                transition: "all 0.1s",
                            }, children: t }, t))) }))] })] }));
    if (item.url) {
        return (_jsx("a", { href: item.url, target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "none" }, children: content }));
    }
    return content;
}
export function News() {
    const { beginnerMode } = useBeginnerMode();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tickerFilter, setTickerFilter] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(300);
    const load = useCallback(async () => {
        try {
            const data = await getNews(50);
            setNews(Array.isArray(data) ? data : []);
            setError(null);
            setLastUpdated(new Date());
            setSecondsUntilRefresh(300);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        load();
        const interval = setInterval(load, 300000); // 5 min
        return () => clearInterval(interval);
    }, [load]);
    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsUntilRefresh((prev) => (prev <= 1 ? 300 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    const filteredNews = tickerFilter
        ? news.filter((n) => (n.tickers ?? []).includes(tickerFilter))
        : news;
    // Group by recency
    const groups = { "last-hour": [], today: [], earlier: [] };
    for (const item of filteredNews) {
        const g = getRecencyGroup(item.publishedAt);
        groups[g].push(item);
    }
    const nextRefreshMin = Math.ceil(secondsUntilRefresh / 60);
    return (_jsxs("div", { style: { padding: 28, maxWidth: 900 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Market News" }), _jsxs("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: ["Live market news \u00B7 refreshes every 5 minutes", lastUpdated && (_jsxs("span", { style: { color: "#2a3a50", marginLeft: 10 }, children: ["\u00B7 next in ", nextRefreshMin, "m"] }))] })] }), tickerFilter && (_jsxs("button", { onClick: () => setTickerFilter(null), style: {
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: `1px solid ${C.blue}55`,
                            background: `${C.blue}18`,
                            color: C.blue,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                        }, children: [_jsx("span", { style: { fontFamily: "monospace" }, children: tickerFilter }), _jsx("span", { children: "\u00D7 Clear filter" })] }))] }), error && _jsx(ErrorBanner, { message: `Failed to load news: ${error}`, onRetry: load }), beginnerMode && (_jsxs("div", { style: {
                    padding: "10px 14px",
                    background: `${C.blue}0d`,
                    border: `1px solid ${C.blue}22`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                    marginBottom: 20,
                }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Beginner tip:" }), " Market news shows events that move prices. Sentiment badges (Bullish/Bearish) indicate whether the news is positive or negative for markets. Click ticker symbols to filter signals for that stock."] })), loading && news.length === 0 ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [0, 1, 2, 3, 4].map((i) => _jsx(SkeletonBlock, { height: 90 }, i)) })) : filteredNews.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCF0", title: tickerFilter ? `No news for ${tickerFilter}` : "No news available", subtitle: tickerFilter ? "Try clearing the ticker filter." : "News will appear here once the news pipeline collects data." })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 28 }, children: GROUP_ORDER.map((groupKey) => {
                    const items = groups[groupKey];
                    if (items.length === 0)
                        return null;
                    return (_jsxs("div", { children: [_jsxs("div", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 12,
                                }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }, children: GROUP_LABELS[groupKey] }), _jsx("span", { style: {
                                            background: "#1e293b",
                                            color: C.textMuted,
                                            fontSize: 10,
                                            padding: "1px 6px",
                                            borderRadius: 10,
                                            fontWeight: 600,
                                        }, children: items.length }), _jsx("div", { style: { flex: 1, height: 1, background: C.border } })] }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: items.map((item) => (_jsx(NewsCard, { item: item, tickerFilter: tickerFilter, onTickerClick: (t) => setTickerFilter(t || null) }, item.id))) })] }, groupKey));
                }) })), _jsxs("p", { style: { color: "#1e293b", fontSize: 12, marginTop: 16 }, children: [filteredNews.length, " article", filteredNews.length !== 1 ? "s" : "", tickerFilter ? ` for ${tickerFilter}` : "", " \u00B7 Auto-refreshes every 5 minutes"] })] }));
}
