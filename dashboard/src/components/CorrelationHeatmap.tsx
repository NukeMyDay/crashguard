import { useEffect, useState } from "react";
import { fetchJSON } from "../api.js";
import { C, Card, useExpertise } from "../context.js";

function corrColor(r: number): string {
  if (r > 0.7) return "#dc2626";
  if (r > 0.4) return "#f97316";
  if (r < -0.7) return "#2563eb";
  if (r < -0.4) return "#60a5fa";
  return "#374151";
}

function corrLabel(r: number): string {
  if (r > 0.7) return "Strong positive — move together";
  if (r > 0.4) return "Moderate positive — tend to move together";
  if (r < -0.7) return "Strong negative — move opposite";
  if (r < -0.4) return "Moderate negative — tend to move opposite";
  return "Weak/no correlation";
}

export function CorrelationHeatmap() {
  const { isBeginner, isProfessional } = useExpertise();
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ row: string; col: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchJSON("/indicators/correlation?days=30");
        if (!cancelled && data && typeof data === "object") setMatrix(data as Record<string, Record<string, number>>);
      } catch {
        // silently degrade — heatmap is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card style={{ padding: "16px 18px" }}>
        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Correlation Matrix
        </div>
        <div style={{ height: 160, background: "#1e293b", borderRadius: 8, opacity: 0.4 }} />
      </Card>
    );
  }

  if (!matrix || Object.keys(matrix).length === 0) return null;

  const labels = Object.keys(matrix);

  // Determine hovered tooltip text
  let tooltipText: string | null = null;
  if (hovered) {
    const r = matrix[hovered.row]?.[hovered.col] ?? 0;
    tooltipText = isBeginner
      ? `${hovered.row} ↔ ${hovered.col}: ${corrLabel(r)}`
      : `${hovered.row} ↔ ${hovered.col}: ${r.toFixed(2)} — ${corrLabel(r)}`;
  }

  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Correlation Matrix
        </span>
        <span style={{ color: C.textMuted, fontSize: 10 }}>30d</span>
      </div>

      {tooltipText && (
        <div style={{
          marginBottom: 8,
          padding: "6px 10px",
          background: "#1a2332",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          fontSize: 11,
          color: C.textSecondary,
          minHeight: 28,
        }}>
          {tooltipText}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ width: 72, padding: "2px 4px" }} />
              {labels.map((col) => (
                <th
                  key={col}
                  style={{
                    color: hovered?.col === col ? C.textPrimary : C.textMuted,
                    fontWeight: 600,
                    padding: "2px 4px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    fontSize: 9,
                    maxWidth: 40,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {col.replace(/-/g, " ").slice(0, 8).toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((row) => (
              <tr key={row}>
                <td
                  style={{
                    color: hovered?.row === row ? C.textPrimary : C.textMuted,
                    fontWeight: 600,
                    fontSize: 9,
                    padding: "2px 6px 2px 0",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {row.replace(/-/g, " ").slice(0, 10).toUpperCase()}
                </td>
                {labels.map((col) => {
                  const r = matrix[row]?.[col] ?? 0;
                  const bg = corrColor(r);
                  const isHov = hovered?.row === row && hovered?.col === col;
                  return (
                    <td
                      key={col}
                      onMouseEnter={() => setHovered({ row, col })}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        background: bg,
                        width: 34,
                        height: 30,
                        textAlign: "center",
                        cursor: "default",
                        border: isHov ? "2px solid #fff4" : "1px solid #0a0e17",
                        borderRadius: 2,
                        transition: "border 0.08s",
                      }}
                    >
                      {isProfessional && (
                        <span style={{ color: "#ffffffcc", fontSize: 8, fontFamily: "monospace", fontWeight: 700 }}>
                          {r.toFixed(2)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { color: "#dc2626", label: "Strong +" },
          { color: "#f97316", label: "Moderate +" },
          { color: "#374151", label: "Neutral" },
          { color: "#60a5fa", label: "Moderate −" },
          { color: "#2563eb", label: "Strong −" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
            <span style={{ color: C.textMuted, fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
