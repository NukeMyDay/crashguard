import { useEffect, useState } from "react";
import { C } from "../context.js";

// ---------------------------------------------------------------------------
// System Status Bar — slim bar at the bottom of the page
// ---------------------------------------------------------------------------

interface SystemHealth {
  indicatorsTotal?: number;
  indicatorsLive?: number;
  staleIndicators?: string[];
  lastScoreAge?: number; // seconds
  dbLatencyMs?: number;
}

async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    const res = await fetch("/v1/system/health");
    if (!res.ok) throw new Error("no endpoint");
    return await res.json();
  } catch {
    // Endpoint may not exist — return empty state
    return {};
  }
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function SystemStatusBar() {
  const [health, setHealth] = useState<SystemHealth>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchSystemHealth();
      if (!cancelled) setHealth(data);
    }

    load();
    const t = setInterval(load, 60_000);
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

  return (
    <div
      style={{
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
      }}
    >
      {/* Live indicator dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: statusColor,
            boxShadow: allLive ? `0 0 5px ${statusColor}` : "none",
            flexShrink: 0,
          }}
        />
        {total !== null && live !== null ? (
          <span style={{ color: allLive ? C.green : C.amber }}>
            {live}/{total} indicators live
          </span>
        ) : (
          <span>System status</span>
        )}
      </div>

      {/* Separator */}
      <span style={{ color: "#1e293b" }}>|</span>

      {/* Stale indicators */}
      {hasStale ? (
        <span style={{ color: C.amber }}>
          {stale.length} stale: {stale.slice(0, 3).join(", ")}
          {stale.length > 3 ? ` +${stale.length - 3}` : ""}
        </span>
      ) : (
        <span style={{ color: C.textMuted }}>All indicators fresh</span>
      )}

      <span style={{ color: "#1e293b" }}>|</span>

      {/* Last score age */}
      {health.lastScoreAge != null ? (
        <span>Last score: {formatAge(health.lastScoreAge)}</span>
      ) : (
        <span>Last score: —</span>
      )}

      {hasDb && (
        <>
          <span style={{ color: "#1e293b" }}>|</span>
          <span style={{ color: health.dbLatencyMs! > 100 ? C.amber : C.textMuted }}>
            DB: {health.dbLatencyMs}ms
          </span>
        </>
      )}
    </div>
  );
}
