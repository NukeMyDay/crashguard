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
export function getNews(limit = 50) {
    return fetchJSON(`/news?limit=${limit}`);
}
export function getStrategyPerformance() {
    return fetchJSON("/strategies/performance");
}
export function getOptionsFlow() {
    return fetchJSON("/options/flow");
}
export function getEarnings() {
    return fetchJSON("/earnings");
}
export function getStressTest(scenario) {
    return fetchJSON("/portfolio/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
    });
}
export function getMacroEvents(days = 30) {
    return fetchJSON(`/macro-events?days=${days}`);
}
export function getWebhooks() {
    return fetchJSON("/alerts/webhooks");
}
export function addWebhook(url, severity) {
    return fetchJSON("/alerts/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, severity }),
    });
}
export function deleteWebhook(id) {
    return fetchJSON(`/alerts/webhooks/${id}`, { method: "DELETE" });
}
export function testWebhookUrl(url) {
    return fetchJSON("/alerts/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
}
export function getDarkPool(date = "latest") {
    return fetchJSON(`/dark-pool?date=${encodeURIComponent(date)}`);
}
export function getPortfolioAnalytics() {
    return fetchJSON("/portfolio/analytics");
}
export function getSignalAccuracy() {
    return fetchJSON("/signals/accuracy");
}
export function getMomentum(top = 30) {
    return fetchJSON(`/momentum?top=${top}`);
}
export function getRebalanceAdvice() {
    return fetchJSON("/portfolio/rebalance-advice");
}
