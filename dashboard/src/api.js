const API_BASE = "/v1";
export async function fetchJSON(path, options) {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
}
export function getDashboard() {
    return fetchJSON("/dashboard");
}
export function getIndicators() {
    return fetchJSON("/indicators");
}
export function getScoreHistory(market, days) {
    return fetchJSON(`/score/history?market=${encodeURIComponent(market)}&days=${days}`);
}
export function getAlerts() {
    return fetchJSON("/alerts");
}
export function getRegime() {
    return fetchJSON("/regime");
}
export function getBriefingToday() {
    return fetchJSON("/briefing/today");
}
export function getSignals(includeClosed) {
    const path = includeClosed ? "/signals?status=all" : "/signals";
    return fetchJSON(path);
}
export function getScanner(type) {
    return fetchJSON(`/scanner/${type}`);
}
export function getStrategies() {
    return fetchJSON("/strategies");
}
export function getPortfolio() {
    return fetchJSON("/portfolio");
}
export function getPortfolioPerformance() {
    return fetchJSON("/portfolio/performance");
}
export function executeTrade(instrument, action, quantity) {
    return fetchJSON("/portfolio/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument, action, quantity }),
    });
}
export function getRegimeHistory() {
    return fetchJSON("/regime/history");
}
export function getIndicatorHistory(slug, days) {
    return fetchJSON(`/indicators/${encodeURIComponent(slug)}/history?days=${days}`);
}
