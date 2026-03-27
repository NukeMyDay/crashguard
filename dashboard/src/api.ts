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

export function getNews(limit = 50) {
  return fetchJSON<any[]>(`/news?limit=${limit}`);
}

export function getStrategyPerformance() {
  return fetchJSON<any[]>("/strategies/performance");
}

export function getOptionsFlow() {
  return fetchJSON<any[]>("/options/flow");
}

export function getEarnings() {
  return fetchJSON<any[]>("/earnings");
}

export function getStressTest(scenario: string) {
  return fetchJSON<any>("/portfolio/stress-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
}

export function getMacroEvents(days = 30) {
  return fetchJSON<any[]>(`/macro-events?days=${days}`);
}

export function getWebhooks() {
  return fetchJSON<any[]>("/alerts/webhooks");
}

export function addWebhook(url: string, severity: string) {
  return fetchJSON<any>("/alerts/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, severity }),
  });
}

export function deleteWebhook(id: string) {
  return fetchJSON<any>(`/alerts/webhooks/${id}`, { method: "DELETE" });
}

export function testWebhookUrl(url: string) {
  return fetchJSON<any>("/alerts/webhook/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function getSignalAccuracy() {
  return fetchJSON<any>("/signals/accuracy");
}

export function getMomentum(top = 30) {
  return fetchJSON<any>(`/momentum?top=${top}`);
}

export function getRebalanceAdvice() {
  return fetchJSON<any>("/portfolio/rebalance-advice");
}

export function getSystemHealth() {
  return fetchJSON<any>("/system/health");
}

export function search(q: string) {
  return fetchJSON<any[]>(`/search?q=${encodeURIComponent(q)}`);
}

// Simple 30-second in-memory cache for repeated API calls
const _cache = new Map<string, { data: any; ts: number }>();
export async function cachedFetch<T>(path: string, ttlMs = 30_000): Promise<T> {
  const cached = _cache.get(path);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data as T;
  const data = await fetchJSON<T>(path);
  _cache.set(path, { data, ts: Date.now() });
  return data;
}
