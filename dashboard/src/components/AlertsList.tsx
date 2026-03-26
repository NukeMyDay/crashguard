import { C } from "../context.js";

interface Alert {
  id: string;
  market: string;
  severity: string;
  message: string;
  crashScore?: number | string;
  triggeredAt: string;
  acknowledgedAt?: string | null;
}

interface Props {
  alerts: Alert[];
}

const SEVERITY_ICONS: Record<string, string> = {
  warning: "⚠️",
  critical: "🔴",
  extreme: "💥",
};

const SEVERITY_COLORS: Record<string, string> = {
  warning: "#f59e0b",
  critical: "#f97316",
  extreme: "#ef4444",
};

const MARKET_FLAGS: Record<string, string> = {
  us: "🇺🇸",
  eu: "🇪🇺",
  asia: "🇯🇵",
  global: "🌐",
};

export function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid #10b98133`,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>✅</span>
        <span style={{ color: "#10b981", fontSize: 13 }}>
          No alerts triggered — markets within normal parameters
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.slice(0, 10).map((alert) => {
        const color = SEVERITY_COLORS[alert.severity] ?? C.textMuted;
        const icon = SEVERITY_ICONS[alert.severity] ?? "⚡";
        const flag = MARKET_FLAGS[alert.market] ?? "🌐";

        return (
          <div
            key={alert.id}
            style={{
              background: C.card,
              borderRadius: 10,
              padding: "12px 16px",
              border: `1px solid ${color}44`,
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span
                  style={{
                    color,
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {alert.severity}
                </span>
              </div>
              <span style={{ color: C.textMuted, fontSize: 12 }}>
                {flag} {alert.market.toUpperCase()}
              </span>
            </div>
            <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.4 }}>{alert.message}</div>
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 5 }}>
              {new Date(alert.triggeredAt).toLocaleString()}
              {alert.crashScore != null && (
                <span style={{ marginLeft: 8, color }}>Score: {Number(alert.crashScore).toFixed(1)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
