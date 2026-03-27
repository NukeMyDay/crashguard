import { useEffect } from "react";
import { C } from "../context.js";

// ---------------------------------------------------------------------------
// Keyboard Shortcut Help Overlay
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

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

export function KeyboardHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 9000,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
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
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⌨️</span>
            <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15 }}>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Shortcut grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            padding: "20px",
          }}
        >
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                {section.section}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {section.items.map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Kbd>{item.key}</Kbd>
                    <span style={{ color: C.textSecondary, fontSize: 12 }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${C.border}`,
            textAlign: "center",
          }}
        >
          <span style={{ color: C.textMuted, fontSize: 11 }}>Press <strong style={{ color: C.textSecondary }}>?</strong> or click the <strong style={{ color: C.textSecondary }}>?</strong> button in the header to toggle this overlay</span>
        </div>
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
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
      }}
    >
      {children}
    </span>
  );
}
