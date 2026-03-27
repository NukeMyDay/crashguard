import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { C } from "../context.js";
const SHORTCUTS = [
    {
        section: "Navigation",
        items: [
            { key: "1 – 9, 0", desc: "Switch pages" },
            { key: "W", desc: "Focus Watchlist input" },
            { key: "D", desc: "Go to Backtest (Dark Pool)" },
            { key: "O", desc: "Go to Scanner (Options)" },
            { key: "ESC", desc: "Close modal" },
        ],
    },
    {
        section: "Actions",
        items: [
            { key: "Ctrl+K / ⌘K", desc: "Command palette" },
            { key: "/", desc: "Quick search" },
            { key: "?", desc: "Show this help" },
            { key: "R", desc: "Refresh page data" },
            { key: "P", desc: "Print / export report" },
            { key: "S", desc: "Toggle sound alerts" },
        ],
    },
];
export function KeyboardHelp({ open, onClose }) {
    useEffect(() => {
        if (!open)
            return;
        function onKey(e) {
            if (e.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
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
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(560px, 90vw)",
                    zIndex: 9001,
                    background: "#0d1424",
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
                    overflow: "hidden",
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px 20px",
                            borderBottom: `1px solid ${C.border}`,
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { fontSize: 18 }, children: "\u2328\uFE0F" }), _jsx("span", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15 }, children: "Keyboard Shortcuts" })] }), _jsx("button", { onClick: onClose, style: {
                                    background: "none",
                                    border: "none",
                                    color: C.textMuted,
                                    cursor: "pointer",
                                    fontSize: 20,
                                    lineHeight: 1,
                                    padding: "0 4px",
                                }, children: "\u00D7" })] }), _jsx("div", { style: {
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 0,
                            padding: "20px",
                        }, children: SHORTCUTS.map((section) => (_jsxs("div", { children: [_jsx("div", { style: {
                                        color: C.textMuted,
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                        fontWeight: 600,
                                        marginBottom: 10,
                                    }, children: section.section }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: section.items.map((item) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx(Kbd, { children: item.key }), _jsx("span", { style: { color: C.textSecondary, fontSize: 12 }, children: item.desc })] }, item.key))) })] }, section.section))) }), _jsx("div", { style: {
                            padding: "12px 20px",
                            borderTop: `1px solid ${C.border}`,
                            textAlign: "center",
                        }, children: _jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: ["Press ", _jsx("strong", { style: { color: C.textSecondary }, children: "?" }), " or click the ", _jsx("strong", { style: { color: C.textSecondary }, children: "?" }), " button in the header to toggle this overlay"] }) })] })] }));
}
function Kbd({ children }) {
    return (_jsx("span", { style: {
            display: "inline-block",
            background: "#1e293b",
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            padding: "2px 7px",
            fontSize: 11,
            fontFamily: "monospace",
            color: C.textSecondary,
            whiteSpace: "nowrap",
            minWidth: 80,
            textAlign: "center",
        }, children: children }));
}
