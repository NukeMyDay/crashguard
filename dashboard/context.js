import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
export const C = {
    bg: "#0a0e17",
    card: "#111827",
    border: "#1e293b",
    blue: "#3b82f6",
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
    gray: "#6b7280",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textMuted: "#475569",
};
const ExpertiseContext = createContext({
    level: "intermediate",
    setLevel: () => { },
    isBeginner: false,
    isProfessional: false,
});
export function ExpertiseLevelProvider({ children }) {
    const [level, setLevelState] = useState(() => {
        try {
            // Migrate from old binary key
            const old = localStorage.getItem("mp_beginner");
            if (old === "true") {
                localStorage.removeItem("mp_beginner");
                localStorage.setItem("mp_expertise_level", "beginner");
                return "beginner";
            }
            const stored = localStorage.getItem("mp_expertise_level");
            if (stored === "beginner" || stored === "intermediate" || stored === "professional") {
                return stored;
            }
        }
        catch { }
        return "intermediate";
    });
    function setLevel(l) {
        setLevelState(l);
        try {
            localStorage.setItem("mp_expertise_level", l);
        }
        catch { }
    }
    return (_jsx(ExpertiseContext.Provider, { value: { level, setLevel, isBeginner: level === "beginner", isProfessional: level === "professional" }, children: children }));
}
export function useExpertise() {
    return useContext(ExpertiseContext);
}
// Backward-compat shim for components still using useBeginnerMode
export function useBeginnerMode() {
    const { isBeginner, setLevel } = useExpertise();
    return {
        beginnerMode: isBeginner,
        toggleBeginnerMode: () => setLevel(isBeginner ? "intermediate" : "beginner"),
    };
}
// Keep old provider name as alias so App.tsx still compiles before we patch it
export const BeginnerModeProvider = ExpertiseLevelProvider;
const RefreshContext = createContext({
    lastUpdated: null,
    secondsUntilRefresh: 60,
    isStale: false,
    isError: false,
    notifyRefreshed: () => { },
    notifyError: () => { },
});
export function RefreshProvider({ children, intervalSec = 60 }) {
    const [lastUpdated, setLastUpdated] = useState(null);
    const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(intervalSec);
    const [isError, setIsError] = useState(false);
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsUntilRefresh((prev) => {
                if (prev <= 1)
                    return intervalSec;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [intervalSec]);
    function notifyRefreshed() {
        setLastUpdated(new Date());
        setSecondsUntilRefresh(intervalSec);
        setIsError(false);
    }
    function notifyError() {
        setIsError(true);
    }
    const isStale = lastUpdated != null && (Date.now() - lastUpdated.getTime()) > 5 * 60 * 1000;
    return (_jsx(RefreshContext.Provider, { value: { lastUpdated, secondsUntilRefresh, isStale, isError, notifyRefreshed, notifyError }, children: children }));
}
export function useRefresh() {
    return useContext(RefreshContext);
}
// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------
export function Card({ children, style, hover }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("div", { onMouseEnter: hover ? () => setHovered(true) : undefined, onMouseLeave: hover ? () => setHovered(false) : undefined, style: {
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${hovered ? C.blue + "66" : C.border}`,
            padding: "20px 24px",
            transition: hover ? "border-color 0.15s ease" : undefined,
            ...style,
        }, children: children }));
}
export function SectionTitle({ children, info }) {
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }, children: [_jsx("h2", { style: { fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }, children: children }), info && _jsx(InfoIcon, { text: info })] }));
}
export function InfoIcon({ text }) {
    const [visible, setVisible] = useState(false);
    return (_jsxs("div", { style: { position: "relative", display: "inline-flex" }, children: [_jsx("span", { onMouseEnter: () => setVisible(true), onMouseLeave: () => setVisible(false), style: { color: C.textMuted, cursor: "help", fontSize: 13, lineHeight: 1 }, title: text, children: "\u2139" }), visible && (_jsx("div", { style: {
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1e293b",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: C.textSecondary,
                    whiteSpace: "pre-wrap",
                    maxWidth: 280,
                    zIndex: 1000,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    lineHeight: 1.5,
                    pointerEvents: "none",
                }, children: text }))] }));
}
export function SkeletonLine({ width, height = 14 }) {
    return (_jsx("div", { className: "skeleton", style: { width: width ?? "100%", height, borderRadius: 4, marginBottom: 8 } }));
}
export function SkeletonBlock({ height = 80 }) {
    return (_jsx("div", { className: "skeleton", style: { width: "100%", height, borderRadius: 12 } }));
}
export function ErrorBanner({ message, onRetry }) {
    return (_jsxs("div", { style: {
            background: "#1a0505",
            border: `1px solid ${C.red}44`,
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
        }, children: [_jsxs("span", { style: { color: "#fca5a5", fontSize: 13 }, children: ["\u26A0 ", message] }), onRetry && (_jsx("button", { onClick: onRetry, style: {
                    background: C.red,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                }, children: "Retry" }))] }));
}
export function EmptyState({ icon = "📭", title, subtitle }) {
    return (_jsxs("div", { style: { padding: "40px 20px", textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 32, marginBottom: 12 }, children: icon }), _jsx("div", { style: { color: C.textSecondary, fontSize: 14, fontWeight: 500 }, children: title }), subtitle && _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 6 }, children: subtitle })] }));
}
export function Badge({ label, color = C.blue, style, }) {
    return (_jsx("span", { style: {
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            textTransform: "uppercase",
            ...style,
        }, children: label }));
}
export const REGIME_COLORS = {
    BULL: "#10b981",
    BEAR: "#ef4444",
    SIDEWAYS: "#f59e0b",
    CRASH: "#b91c1c",
    RECOVERY: "#3b82f6",
};
export function getScoreColor(score) {
    if (score >= 75)
        return "#ef4444";
    if (score >= 60)
        return "#f97316";
    if (score >= 50)
        return "#f59e0b";
    if (score >= 25)
        return "#eab308";
    return "#10b981";
}
export function getScoreLabel(score) {
    if (score >= 90)
        return "Extreme";
    if (score >= 75)
        return "Critical";
    if (score >= 60)
        return "Warning";
    if (score >= 50)
        return "High";
    if (score >= 25)
        return "Moderate";
    return "Low Risk";
}
// Table shared styles
export const TH = {
    padding: "10px 14px",
    textAlign: "left",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #1e293b",
    background: "#0d1424",
    whiteSpace: "nowrap",
};
export const TD = {
    padding: "11px 14px",
    color: "#94a3b8",
    fontSize: 13,
    verticalAlign: "middle",
    borderBottom: "1px solid #0f1a2e",
};
