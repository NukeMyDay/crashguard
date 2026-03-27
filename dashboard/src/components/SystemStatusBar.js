import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { C } from "../context.js";
async function fetchSystemHealth() {
    try {
        const res = await fetch("/v1/system/health");
        if (!res.ok)
            throw new Error("no endpoint");
        return await res.json();
    }
    catch {
        // Endpoint may not exist — return empty state
        return {};
    }
}
function formatAge(seconds) {
    if (seconds < 60)
        return `${seconds}s ago`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
export function SystemStatusBar() {
    const [health, setHealth] = useState({});
    useEffect(() => {
        let cancelled = false;
        async function load() {
            const data = await fetchSystemHealth();
            if (!cancelled)
                setHealth(data);
        }
        load();
        const t = setInterval(load, 60000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, []);
    const stale = health.staleIndicators ?? [];
    const total = health.indicatorsTotal ?? null;
    const live = health.indicatorsLive ?? null;
    const hasDb = health.dbLatencyMs != null;
    const allLive = total !== null && live !== null && live === total;
    const hasStale = stale.length > 0;
    const statusColor = hasStale ? C.amber : C.green;
    return (_jsxs("div", { style: {
            height: 26,
            background: "#080c13",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 16,
            gap: 16,
            flexShrink: 0,
            fontFamily: "monospace",
            fontSize: 11,
            color: C.textMuted,
            overflow: "hidden",
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: {
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: statusColor,
                            boxShadow: allLive ? `0 0 5px ${statusColor}` : "none",
                            flexShrink: 0,
                        } }), total !== null && live !== null ? (_jsxs("span", { style: { color: allLive ? C.green : C.amber }, children: [live, "/", total, " indicators live"] })) : (_jsx("span", { children: "System status" }))] }), _jsx("span", { style: { color: "#1e293b" }, children: "|" }), hasStale ? (_jsxs("span", { style: { color: C.amber }, children: [stale.length, " stale: ", stale.slice(0, 3).join(", "), stale.length > 3 ? ` +${stale.length - 3}` : ""] })) : (_jsx("span", { style: { color: C.textMuted }, children: "All indicators fresh" })), _jsx("span", { style: { color: "#1e293b" }, children: "|" }), health.lastScoreAge != null ? (_jsxs("span", { children: ["Last score: ", formatAge(health.lastScoreAge)] })) : (_jsx("span", { children: "Last score: \u2014" })), hasDb && (_jsxs(_Fragment, { children: [_jsx("span", { style: { color: "#1e293b" }, children: "|" }), _jsxs("span", { style: { color: health.dbLatencyMs > 100 ? C.amber : C.textMuted }, children: ["DB: ", health.dbLatencyMs, "ms"] })] }))] }));
}
