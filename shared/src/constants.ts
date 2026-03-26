export const MARKETS = ["global", "us", "eu", "asia"] as const;

export const CRASH_SCORE_THRESHOLDS = {
  LOW: 25,
  MODERATE: 50,
  WARNING: 60,
  HIGH: 75,
  EXTREME: 90,
} as const;

export const INDICATORS = [
  { slug: "vix", name: "VIX Volatility Index", source: "yahoo", category: "volatility", frequency: "daily", weight: 0.15 },
  { slug: "yield-curve-2y10y", name: "Yield Curve 2Y-10Y Spread", source: "fred", category: "macro", frequency: "daily", weight: 0.15, fredSeries: "T10Y2Y" },
  { slug: "credit-spreads-hy", name: "HY Credit Spreads", source: "fred", category: "credit", frequency: "daily", weight: 0.12, fredSeries: "BAMLH0A0HYM2" },
  { slug: "put-call-ratio", name: "Put/Call Ratio", source: "yahoo", category: "sentiment", frequency: "daily", weight: 0.10 },
  { slug: "spx-breadth-200ma", name: "S&P 500 Breadth (% above 200-day MA)", source: "yahoo", category: "market", frequency: "daily", weight: 0.10 },
  { slug: "dxy", name: "DXY Dollar Index", source: "yahoo", category: "macro", frequency: "daily", weight: 0.08 },
  { slug: "pmi-manufacturing", name: "PMI Manufacturing", source: "fred", category: "macro", frequency: "monthly", weight: 0.08, fredSeries: "MPMICTOT" },
  { slug: "consumer-confidence", name: "Consumer Confidence (UMCSENT)", source: "fred", category: "sentiment", frequency: "monthly", weight: 0.08, fredSeries: "UMCSENT" },
  { slug: "m2-money-supply", name: "M2 Money Supply", source: "fred", category: "macro", frequency: "monthly", weight: 0.06, fredSeries: "M2SL" },
  { slug: "fear-greed-index", name: "Fear & Greed Index", source: "cnn", category: "sentiment", frequency: "daily", weight: 0.08 },
  { slug: "eu-sovereign-spread", name: "EU Sovereign Yield (10Y)", source: "ecb", category: "credit", frequency: "daily", weight: 0.05 },
  { slug: "eu-ciss", name: "EU Composite Systemic Stress (CISS)", source: "ecb", category: "volatility", frequency: "weekly", weight: 0.05 },
] as const;
