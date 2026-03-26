import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { C } from "../context.js";

const TOUR_STEPS = [
  { target: "#crash-score-gauge", title: "Crash Score", body: "This is your main signal. Below 25 = calm markets. Above 75 = danger zone.", icon: "\uD83C\uDFAF" },
  { target: "#market-grid", title: "Market Status", body: "Track US, EU, and Asia markets separately. Each has its own crash score.", icon: "\uD83C\uDF0D" },
  { target: "#nav-signals", title: "Trading Signals", body: "AI-generated trade recommendations with entry, exit, and risk details.", icon: "\uD83D\uDCC8" },
  { target: "#expertise-toggle", title: "Expertise Mode", body: "Switch between Beginner (full explanations) and Professional (dense data) modes anytime.", icon: "\uD83C\uDF93" },
  { target: "#nav-watchlist", title: "Your Watchlist", body: "Add any ticker to track it with live prices and custom alerts.", icon: "\uD83D\uDC41\uFE0F" },
];

const STORAGE_KEY = "mp_toured";

function getTargetRect(selector) {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  } catch {
    return null;
  }
}

export function OnboardingTour({ forceOpen = false, onClose }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const startTour = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  useEffect(() => {
    if (forceOpen) { startTour(); return; }
    try {
      const toured = localStorage.getItem(STORAGE_KEY);
      if (!toured) {
        const t = setTimeout(startTour, 800);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable */ }
  }, [forceOpen, startTour]);

  useEffect(() => {
    if (!active) return;
    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;
    const rect = getTargetRect(currentStep.target);
    setTargetRect(rect);
    if (rect) {
      document.querySelector(currentStep.target)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [active, step]);

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) { setStep((s) => s + 1); } else { completeTour(); }
  }

  function completeTour() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      if (!localStorage.getItem("mp_expertise_level")) {
        localStorage.setItem("mp_expertise_level", "beginner");
      }
    } catch { /* ignore */ }
    onClose?.();
  }

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  const tooltipStyle = {
    position: "fixed",
    zIndex: 10001,
    width: 320,
    background: "#0d1424",
    border: `1px solid ${C.blue}55`,
    borderRadius: 14,
    boxShadow: `0 0 40px ${C.blue}22, 0 8px 32px #00000080`,
    padding: "20px 22px",
  };

  if (targetRect) {
    const spaceBelow = vpH - targetRect.bottom;
    const spaceAbove = targetRect.top;
    if (spaceBelow > 200 || spaceBelow > spaceAbove) {
      tooltipStyle.top = Math.min(targetRect.bottom + 12, vpH - 220);
    } else {
      tooltipStyle.bottom = vpH - targetRect.top + 12;
    }
    tooltipStyle.left = Math.max(12, Math.min(targetRect.left, vpW - 344));
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  return _jsxs("div", {
    style: { position: "fixed", inset: 0, zIndex: 10000 },
    children: [
      _jsx("div", { onClick: completeTour, style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(1px)" } }),
      targetRect && _jsx("div", {
        style: {
          position: "fixed", top: targetRect.top - 4, left: targetRect.left - 4,
          width: targetRect.width + 8, height: targetRect.height + 8,
          borderRadius: 10, border: `2px solid ${C.blue}`,
          boxShadow: `0 0 0 4px ${C.blue}22, 0 0 20px ${C.blue}44`,
          animation: "tour-pulse 1.8s ease-in-out infinite", pointerEvents: "none", zIndex: 10001,
        },
      }),
      _jsxs("div", {
        style: tooltipStyle,
        children: [
          _jsxs("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
            children: [
              _jsx("div", {
                style: { display: "flex", gap: 6 },
                children: TOUR_STEPS.map((_, i) =>
                  _jsx("div", {
                    style: { width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? C.blue : (i < step ? `${C.blue}66` : "#1e293b"), transition: "all 0.2s" },
                  }, i)
                ),
              }),
              _jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: [`${step + 1} of ${TOUR_STEPS.length}`] }),
            ],
          }),
          _jsxs("div", {
            style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
            children: [
              _jsx("span", { style: { fontSize: 22 }, children: currentStep.icon }),
              _jsx("div", { style: { color: C.textPrimary, fontSize: 17, fontWeight: 700 }, children: currentStep.title }),
            ],
          }),
          _jsx("div", { style: { color: C.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }, children: currentStep.body }),
          _jsxs("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between" },
            children: [
              _jsx("button", {
                onClick: completeTour,
                style: { background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", color: C.textMuted, fontSize: 13, cursor: "pointer" },
                children: "Skip tour",
              }),
              _jsx("button", {
                onClick: handleNext,
                style: { background: C.blue, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 12px ${C.blue}44` },
                children: isLast ? "Done \uD83C\uDF89" : "Next \u2192",
              }),
            ],
          }),
        ],
      }),
      _jsx("style", { children: `@keyframes tour-pulse{0%,100%{box-shadow:0 0 0 4px ${C.blue}22,0 0 20px ${C.blue}44}50%{box-shadow:0 0 0 8px ${C.blue}11,0 0 32px ${C.blue}66}}` }),
    ],
  });
}

export function resetTour() {
  try { localStorage.removeItem("mp_toured"); } catch { /* ignore */ }
}
