import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, Card, SectionTitle, SkeletonBlock } from "../context.js";
import { fetchJSON } from "../api.js";

interface Attribution {
  slug: string;
  name: string;
  category: string;
  normalizedValue: number;
  weight: number;
  contribution: number;
  direction: "bearish" | "neutral" | "bullish";
  recordedAt: string;
}

function contributionColor(normalizedValue: number): string {
  if (normalizedValue > 66) return C.red;
  if (normalizedValue >= 33) return C.amber;
  return C.green;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: Attribution = payload[0].payload;
  return (
    <div
      style={{
        background: "#1a2235",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: C.textPrimary, fontWeight: 600, marginBottom: 6 }}>{d.name}</div>
      <div style={{ color: C.textMuted, marginBottom: 2 }}>
        Normalized: <span style={{ color: contributionColor(d.normalizedValue), fontWeight: 600 }}>{d.normalizedValue.toFixed(1)}</span>
      </div>
      <div style={{ color: C.textMuted, marginBottom: 2 }}>
        Weight: <span style={{ color: C.textSecondary }}>{(d.weight * 100).toFixed(1)}%</span>
      </div>
      <div style={{ color: C.textMuted }}>
        Contribution: <span style={{ color: C.textPrimary, fontWeight: 700 }}>{d.contribution.toFixed(2)}</span>
      </div>
    </div>
  );
};

export function AttributionPanel() {
  const [data, setData] = useState<Attribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchJSON<Attribution[]>("/dashboard/attribution");
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <SkeletonBlock height={220} />;

  if (error || data.length === 0) {
    return (
      <Card style={{ padding: "20px 24px" }}>
        <SectionTitle info="Which indicators are driving today's crash score, weighted by their relative importance.">
          Performance Attribution
        </SectionTitle>
        <div style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>
          {error ? "Attribution data unavailable" : "No indicator data yet"}
        </div>
      </Card>
    );
  }

  // Show top 8 by contribution
  const chartData = data.slice(0, 8);

  return (
    <Card style={{ padding: "20px 24px" }}>
      <SectionTitle info="Which indicators are driving today's crash score, weighted by their relative importance.">
        Performance Attribution
      </SectionTitle>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, marginTop: 4 }}>
        {[
          { color: C.green, label: "Low risk (<33)" },
          { color: C.amber, label: "Moderate (33–66)" },
          { color: C.red, label: "High risk (>66)" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ color: C.textMuted, fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tick={{ fill: C.textMuted, fontSize: 11 }}
            axisLine={{ stroke: C.border }}
            tickLine={false}
            label={{ value: "Contribution to crash score", fill: C.textMuted, fontSize: 10, position: "insideBottomRight", offset: -5 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: C.textSecondary, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
          <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.slug} fill={contributionColor(entry.normalizedValue)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
