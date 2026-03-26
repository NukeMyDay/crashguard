const API_BASE = "/v1";

export async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getDashboard() {
  return fetchJSON<any>("/dashboard");
}

export function getIndicators() {
  return fetchJSON<any[]>("/indicators");
}

export function getScoreHistory(market: string, days: number) {
  return fetchJSON<any[]>(`/score/history?market=${encodeURIComponent(market)}&days=${days}`);
}

export function getAlerts() {
  return fetchJSON<any[]>("/alerts");
}

export function getRegime() {
  return fetchJSON<any>("/regime");
}

export function getBriefingToday() {
  return fetchJSON<any>("/briefing/today");
}

export function getSignals(includeClosed?: boolean) {
  const path = includeClosed ? "/signals?status=all" : "/signals";
  return fetchJSON<any[]>(path);
}

export function getScanner(type: "penny" | "oversold" | "short" | "options") {
  return fetchJSON<any[]>(`/scanner/${type}`);
}

export function getStrategies() {
  return fetchJSON<any[]>("/strategies");
}

export function getPortfolio() {
  return fetchJSON<any>("/portfolio");
}

export function getPortfolioPerformance() {
  return fetchJSON<any[]>("/portfolio/performance");
}

export function executeTrade(instrument: string, action: string, quantity: number) {
  return fetchJSON<any>("/portfolio/trade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instrument, action, quantity }),
  });
}

export function getRegimeHistory() {
  return fetchJSON<any[]>("/regime/history");
}

export function getIndicatorHistory(slug: string, days: number) {
  return fetchJSON<any[]>(`/indicators/${encodeURIComponent(slug)}/history?days=${days}`);
}
