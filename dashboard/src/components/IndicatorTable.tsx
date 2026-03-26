import { useState } from "react";
import { C, TH, TD, InfoIcon, Badge, getScoreColor, useExpertise } from "../context.js";

interface Indicator {
  id: string;
  name: string;
  slug: string;
  category: string;
  source: string;
  weight: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  latestValue?: {
    value: number;
    normalizedValue: number;
    recordedAt?: string;
  };
}

interface Props {
  indicators: Indicator[];
}

const CATEGORY_COLORS: Record<string, string> = {
  volatility: "#ef4444",
  sentiment: "#f59e0b",
  macro: "#3b82f6",
  credit: "#8b5cf6",
  market: "#10b981",
};

const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  vix: "VIX measures market fear — how much traders expect prices to move. High VIX = high uncertainty.",
  "yield-curve-2y10y":
    "Yield curve spread (10Y minus 2Y Treasury). Negative = inverted yield curve, historically signals recession.",
  "credit-spreads-hy":
    "High yield credit spread — difference between junk bonds and Treasuries. Widens when investors fear defaults.",
  "put-call-ratio":
    "Ratio of put options to call options. High = bearish sentiment, traders betting on price drops.",
  "spx-breadth-200ma":
    "Percentage of S&P 500 stocks trading above their 200-day moving average. Low = broad weakness.",
  dxy: "US Dollar Index. Strong dollar often hurts risk assets like stocks and emerging markets.",
  "pmi-manufacturing":
    "PMI Manufacturing Index. Below 50 = contracting economy. Leading indicator for growth.",
  "consumer-confidence":
    "Consumer Confidence Index. High = people feel good about spending. Low = recession fears.",
  "m2-money-supply": "M2 money supply growth. Rapid expansion can fuel inflation and asset bubbles.",
  "fear-greed-index": "CNN Fear & Greed Index. Extreme fear = potential buy opportunity; extreme greed = caution.",
};

// Plain-English explanations for Beginner mode
const BEGINNER_WHY_MATTERS: Record<string, string> = {
  vix: "Measures fear in the market — the higher it is, the more scared investors are.",
  "yield-curve-2y10y": "When short-term rates exceed long-term rates, recession risk rises. It has predicted every US recession.",
  "credit-spreads-hy": "Shows how nervous lenders are about risky borrowers. Widening spreads = rising fear of defaults.",
  "put-call-ratio": "High value = traders are buying more 'insurance' against falling prices. A bearish signal.",
  "spx-breadth-200ma": "Fewer stocks trending up = weak market foundation, even if the index looks OK.",
  dxy: "A very strong dollar can hurt stocks and emerging markets by tightening global financial conditions.",
  "pmi-manufacturing": "Factory activity below 50 means the economy is shrinking — often leads to job losses.",
  "consumer-confidence": "When people feel financially insecure, they spend less. Less spending = slower economy.",
  "m2-money-supply": "Too much money growth can cause inflation and asset bubbles that eventually pop.",
  "fear-greed-index": "Extreme greed often precedes corrections. When everyone is confident, it's time to be careful.",
};

function RiskScoreBar({ value }: { value: number }) {
  const color = getScoreColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 28 }}>
        {value.toFixed(0)}
      </span>
    </div>
  );
}

export function IndicatorTable({ indicators }: Props) {
  const [sortCol, setSortCol] = useState<"weight" | "norm">("weight");
  const { isBeginner, isProfessional } = useExpertise();

  const sorted = [...indicators].sort((a, b) => {
    if (sortCol === "weight") return Number(b.weight) - Number(a.weight);
    const an = a.latestValue ? Number(a.latestValue.normalizedValue) : -1;
    const bn = b.latestValue ? Number(b.latestValue.normalizedValue) : -1;
    return bn - an;
  });

  // Professional: compact padding
  const tdStyle: React.CSSProperties = isProfessional
    ? { ...TD, padding: "7px 10px", fontSize: 12 }
    : TD;
  const thStyle: React.CSSProperties = isProfessional
    ? { ...TH, padding: "7px 10px", fontSize: 10 }
    : TH;

  function SortHeader({ col, children }: { col: "weight" | "norm"; children: React.ReactNode }) {
    const isActive = sortCol === col;
    return (
      <th
        style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
        onClick={() => setSortCol(col)}
      >
        <span style={{ color: isActive ? C.blue : undefined }}>{children}</span>
        {isActive && <span style={{ marginLeft: 4, color: C.blue }}>↓</span>}
      </th>
    );
  }

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Indicator</th>
              {!isProfessional && <th style={thStyle}>Category</th>}
              {isProfessional && <th style={thStyle}>Cat.</th>}
              {!isProfessional && <th style={thStyle}>Source</th>}
              <SortHeader col="weight">Weight</SortHeader>
              <th style={thStyle}>Raw Value</th>
              <SortHeader col="norm">
                Risk Score{" "}
                <InfoIcon text="Normalized 0–100 score. Higher = greater crash risk contribution from this indicator." />
              </SortHeader>
              {isBeginner && <th style={thStyle}>Why it matters</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((ind) => {
              const norm = ind.latestValue ? Number(ind.latestValue.normalizedValue) : null;
              const raw = ind.latestValue ? Number(ind.latestValue.value) : null;
              const catColor = CATEGORY_COLORS[ind.category] ?? C.textMuted;
              const desc = INDICATOR_DESCRIPTIONS[ind.slug];
              const whyMatters = BEGINNER_WHY_MATTERS[ind.slug];

              return (
                <tr key={ind.id}>
                  <td style={{ ...tdStyle, color: C.textPrimary, fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{ind.name}</span>
                      {desc && <InfoIcon text={desc} />}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <Badge
                      label={isProfessional ? ind.category.slice(0, 3).toUpperCase() : ind.category}
                      color={catColor}
                      style={{ fontSize: 10 }}
                    />
                  </td>
                  {!isProfessional && (
                    <td style={{ ...tdStyle, color: C.textMuted, textTransform: "uppercase", fontSize: 11 }}>
                      {ind.source}
                    </td>
                  )}
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                    {(Number(ind.weight) * 100).toFixed(0)}%
                  </td>
                  <td style={{ ...tdStyle, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                    {raw !== null
                      ? isProfessional ? raw.toFixed(4) : raw.toFixed(2)
                      : <span style={{ color: C.textMuted }}>No data</span>}
                  </td>
                  <td style={tdStyle}>
                    {norm !== null ? (
                      <RiskScoreBar value={norm} />
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>Awaiting data</span>
                    )}
                  </td>
                  {isBeginner && (
                    <td style={{ ...tdStyle, color: C.textSecondary, fontSize: 12, maxWidth: 260, lineHeight: 1.4 }}>
                      {whyMatters ?? "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
