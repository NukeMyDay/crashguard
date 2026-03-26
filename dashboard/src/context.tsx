import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

// ---------------------------------------------------------------------------
// Beginner Mode context
// ---------------------------------------------------------------------------
interface BeginnerModeCtx {
  beginnerMode: boolean;
  toggleBeginnerMode: () => void;
}

const BeginnerModeContext = createContext<BeginnerModeCtx>({
  beginnerMode: false,
  toggleBeginnerMode: () => {},
});

export function BeginnerModeProvider({ children }: { children: ReactNode }) {
  const [beginnerMode, setBeginnerMode] = useState(() => {
    try {
      return localStorage.getItem("mp_beginner") === "true";
    } catch {
      return false;
    }
  });

  function toggleBeginnerMode() {
    setBeginnerMode((v) => {
      const next = !v;
      try {
        localStorage.setItem("mp_beginner", String(next));
      } catch {}
      return next;
    });
  }

  return (
    <BeginnerModeContext.Provider value={{ beginnerMode, toggleBeginnerMode }}>
      {children}
    </BeginnerModeContext.Provider>
  );
}

export function useBeginnerMode() {
  return useContext(BeginnerModeContext);
}

// ---------------------------------------------------------------------------
// Auto-refresh context
// ---------------------------------------------------------------------------
interface RefreshCtx {
  lastUpdated: Date | null;
  secondsUntilRefresh: number;
  isStale: boolean;
  isError: boolean;
  notifyRefreshed: () => void;
  notifyError: () => void;
}

const RefreshContext = createContext<RefreshCtx>({
  lastUpdated: null,
  secondsUntilRefresh: 60,
  isStale: false,
  isError: false,
  notifyRefreshed: () => {},
  notifyError: () => {},
});

export function RefreshProvider({ children, intervalSec = 60 }: { children: ReactNode; intervalSec?: number }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(intervalSec);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) return intervalSec;
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

  return (
    <RefreshContext.Provider value={{ lastUpdated, secondsUntilRefresh, isStale, isError, notifyRefreshed, notifyError }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------

export function Card({ children, style, hover }: { children: ReactNode; style?: React.CSSProperties; hover?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={hover ? () => setHovered(true) : undefined}
      onMouseLeave={hover ? () => setHovered(false) : undefined}
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${hovered ? C.blue + "66" : C.border}`,
        padding: "20px 24px",
        transition: hover ? "border-color 0.15s ease" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, info }: { children: ReactNode; info?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }}>{children}</h2>
      {info && <InfoIcon text={info} />}
    </div>
  );
}

export function InfoIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ color: C.textMuted, cursor: "help", fontSize: 13, lineHeight: 1 }}
        title={text}
      >
        ℹ
      </span>
      {visible && (
        <div
          style={{
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
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function SkeletonLine({ width, height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: width ?? "100%", height, borderRadius: 4, marginBottom: 8 }}
    />
  );
}

export function SkeletonBlock({ height = 80 }: { height?: number }) {
  return (
    <div className="skeleton" style={{ width: "100%", height, borderRadius: 12 }} />
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        background: "#1a0505",
        border: `1px solid ${C.red}44`,
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <span style={{ color: "#fca5a5", fontSize: 13 }}>⚠ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: C.red,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ color: C.textSecondary, fontSize: 14, fontWeight: 500 }}>{title}</div>
      {subtitle && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

export function Badge({
  label,
  color = C.blue,
  style,
}: {
  label: string;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
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
      }}
    >
      {label}
    </span>
  );
}

export const REGIME_COLORS: Record<string, string> = {
  BULL: "#10b981",
  BEAR: "#ef4444",
  SIDEWAYS: "#f59e0b",
  CRASH: "#b91c1c",
  RECOVERY: "#3b82f6",
};

export function getScoreColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 50) return "#f59e0b";
  if (score >= 25) return "#eab308";
  return "#10b981";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Extreme";
  if (score >= 75) return "Critical";
  if (score >= 60) return "Warning";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Low Risk";
}

// Table shared styles
export const TH: React.CSSProperties = {
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

export const TD: React.CSSProperties = {
  padding: "11px 14px",
  color: "#94a3b8",
  fontSize: 13,
  verticalAlign: "middle",
  borderBottom: "1px solid #0f1a2e",
};
