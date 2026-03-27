import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { getScoreColor, getScoreLabel, C, useExpertise } from "../context.js";
function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
    const s = polarToCartesian(cx, cy, r, startAngle);
    const e = polarToCartesian(cx, cy, r, endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
export function CrashScoreGauge({ score, size = 220 }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const { isBeginner } = useExpertise();
    const safeScore = Math.min(100, Math.max(0, score || 0));
    const cx = size / 2;
    const cy = size / 2 + 14;
    const r = size * 0.34;
    const strokeWidth = size * 0.09;
    // Gauge spans 260° total
    const startAngle = -130;
    const endAngle = 130;
    const sweepDeg = endAngle - startAngle;
    // Score angle
    const scoreAngle = safeScore > 0 ? startAngle + (safeScore / 100) * sweepDeg : startAngle;
    const color = getScoreColor(safeScore);
    const label = getScoreLabel(safeScore);
    // Needle tip position
    const needle = polarToCartesian(cx, cy, r, scoreAngle);
    return (_jsxs("div", { style: { position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }, onMouseEnter: () => setShowTooltip(true), onMouseLeave: () => setShowTooltip(false), children: [_jsxs("svg", { width: size, height: size * 0.65, viewBox: `0 0 ${size} ${size * 0.65}`, style: { display: "block", cursor: "help" }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gaugeGrad", x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [_jsx("stop", { offset: "0%", stopColor: "#10b981" }), _jsx("stop", { offset: "35%", stopColor: "#84cc16" }), _jsx("stop", { offset: "55%", stopColor: "#f59e0b" }), _jsx("stop", { offset: "75%", stopColor: "#f97316" }), _jsx("stop", { offset: "100%", stopColor: "#ef4444" })] }), _jsxs("filter", { id: "glow", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "coloredBlur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "coloredBlur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("path", { d: describeArc(cx, cy, r, startAngle, endAngle), fill: "none", stroke: "#1e293b", strokeWidth: strokeWidth, strokeLinecap: "round" }), safeScore > 0 && (_jsx("path", { d: describeArc(cx, cy, r, startAngle, scoreAngle), fill: "none", stroke: "url(#gaugeGrad)", strokeWidth: strokeWidth, strokeLinecap: "round", filter: "url(#glow)" })), safeScore > 0 && (_jsxs(_Fragment, { children: [_jsx("circle", { cx: needle.x, cy: needle.y, r: strokeWidth / 2 + 4, fill: color, opacity: 0.2 }), _jsx("circle", { cx: needle.x, cy: needle.y, r: strokeWidth / 2, fill: color })] })), _jsx("text", { x: cx, y: cy - 2, textAnchor: "middle", fill: color, fontSize: size * 0.24, fontWeight: "700", fontFamily: "Inter, system-ui", style: { fontVariantNumeric: "tabular-nums" }, children: Math.round(safeScore) }), _jsx("text", { x: cx, y: cy + size * 0.115, textAnchor: "middle", fill: C.textSecondary, fontSize: size * 0.065, fontWeight: "500", fontFamily: "Inter, system-ui", letterSpacing: "0.03em", children: label.toUpperCase() }), _jsx("text", { x: polarToCartesian(cx, cy, r + strokeWidth / 2 + 10, startAngle).x, y: polarToCartesian(cx, cy, r + strokeWidth / 2 + 10, startAngle).y + 4, textAnchor: "middle", fill: C.textMuted, fontSize: size * 0.052, fontFamily: "Inter, system-ui", children: "0" }), _jsx("text", { x: polarToCartesian(cx, cy, r + strokeWidth / 2 + 10, endAngle).x, y: polarToCartesian(cx, cy, r + strokeWidth / 2 + 10, endAngle).y + 4, textAnchor: "middle", fill: C.textMuted, fontSize: size * 0.052, fontFamily: "Inter, system-ui", children: "100" })] }), showTooltip && (_jsx("div", { style: {
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1a2332",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: C.textSecondary,
                    maxWidth: 260,
                    zIndex: 1000,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    lineHeight: 1.6,
                    marginTop: 8,
                    pointerEvents: "none",
                    whiteSpace: "normal",
                    textAlign: "center",
                }, children: "The Crash Probability Score aggregates 12 market indicators weighted by historical predictive power. A score above 70 preceded 80% of major corrections since 2008." })), isBeginner && (_jsxs("div", { style: {
                    marginTop: 10,
                    padding: "10px 14px",
                    background: `${C.blue}0d`,
                    border: `1px solid ${C.blue}33`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                    maxWidth: size,
                    lineHeight: 1.6,
                    textAlign: "center",
                }, children: [_jsx("strong", { style: { color: C.textPrimary }, children: "What does this score mean?" }), _jsx("br", {}), "This score estimates the probability of a major market crash.", " ", _jsx("span", { style: { color: C.amber }, children: "Above 50 = elevated risk." }), " ", _jsx("span", { style: { color: C.red }, children: "Above 75 = danger zone." })] }))] }));
}
