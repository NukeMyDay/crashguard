// Market types
export type Market = "global" | "us" | "eu" | "asia";
export type Severity = "warning" | "critical" | "extreme";
export type IndicatorCategory = "market" | "sentiment" | "macro" | "volatility" | "credit";
export type IndicatorSource = "fred" | "yahoo" | "alpha_vantage" | "cnn" | "ecb";
export type IndicatorFrequency = "hourly" | "daily" | "weekly" | "monthly";

// API response types
export interface Indicator {
  id: string;
  slug: string;
  name: string;
  category: IndicatorCategory;
  description: string | null;
  source: IndicatorSource;
  frequency: IndicatorFrequency;
  weight: number;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  isActive: boolean;
  latestValue?: IndicatorValue;
}

export interface IndicatorValue {
  id: string;
  indicatorId: string;
  value: number;
  normalizedValue: number;
  recordedAt: string;
  createdAt: string;
}

export interface ComponentScores {
  volatility?: number;
  sentiment?: number;
  macro?: number;
  credit?: number;
  market?: number;
}

export interface MarketScore {
  id: string;
  market: Market;
  crashScore: number;
  componentScores: ComponentScores;
  calculatedAt: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  market: Market;
  severity: Severity;
  message: string;
  crashScore: number;
  triggeredAt: string;
  acknowledgedAt: string | null;
}

export interface DashboardResponse {
  scores: MarketScore[];
  alerts: Alert[];
  lastUpdated: string;
}
