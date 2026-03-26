import { useEffect, useState, useCallback } from "react";
import { getNews, getSignals } from "../api.js";
import {
  C,
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Badge,
  useBeginnerMode,
} from "../context.js";

interface NewsItem {
  id: string;
  headline: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  sentiment?: "bullish" | "bearish" | "neutral" | string;
  tickers?: string[];
  summary?: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: C.green,
  bearish: C.red,
  neutral: C.amber,
};

const SENTIMENT_LABELS: Record<string, string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  neutral: "Neutral",
};

function timeAgo(ts?: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getRecencyGroup(ts?: string): "last-hour" | "today" | "earlier" {
  if (!ts) return "earlier";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60 * 60_000) return "last-hour";
  if (diff < 24 * 60 * 60_000) return "today";
  return "earlier";
}

const GROUP_LABELS: Record<string, string> = {
  "last-hour": "Last Hour",
  today: "Today",
  earlier: "Earlier",
};

const GROUP_ORDER = ["last-hour", "today", "earlier"];

interface NewsCardProps {
  item: NewsItem;
  tickerFilter: string | null;
  onTickerClick: (ticker: string) => void;
}

function NewsCard({ item, tickerFilter, onTickerClick }: NewsCardProps) {
  const [hovered, setHovered] = useState(false);
  const sentiment = item.sentiment?.toLowerCase();
  const sentimentColor = sentiment ? (SENTIMENT_COLORS[sentiment] ?? C.textMuted) : null;
  const sentimentLabel = sentiment ? (SENTIMENT_LABELS[sentiment] ?? sentiment) : null;

  const content = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#131e2e" : C.card,
        border: `1px solid ${C.border}`,
        borderLeft: sentimentColor ? `3px solid ${sentimentColor}` : `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: item.url ? "pointer" : "default",
        transition: "border-color 0.12s, background 0.12s",
      } as React.CSSProperties}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <p style={{ color: C.textPrimary, fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5, flex: 1 }}>
          {item.headline}
        </p>
        {sentimentColor && sentimentLabel && (
          <Badge label={sentimentLabel} color={sentimentColor} style={{ flexShrink: 0, marginTop: 2 }} />
        )}
      </div>

      {/* Summary */}
      {item.summary && (
        <p style={{ color: C.textSecondary, fontSize: 12, margin: "0 0 10px", lineHeight: 1.6 }}>
          {item.summary}
        </p>
      )}

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {item.source && (
          <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 500 }}>{item.source}</span>
        )}
        {item.publishedAt && (
          <span style={{ color: "#2a3a50", fontSize: 11 }}>·</span>
        )}
        {item.publishedAt && (
          <span style={{ color: C.textMuted, fontSize: 11 }}>{timeAgo(item.publishedAt)}</span>
        )}

        {/* Tickers */}
        {(item.tickers ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: "auto" }}>
            {(item.tickers ?? []).map((t) => (
              <button
                key={t}
                onClick={(e) => { e.stopPropagation(); onTickerClick(tickerFilter === t ? "" : t); }}
                style={{
                  padding: "1px 8px",
                  borderRadius: 4,
                  border: `1px solid ${tickerFilter === t ? C.blue + "88" : C.border}`,
                  background: tickerFilter === t ? `${C.blue}22` : "#1e293b",
                  color: tickerFilter === t ? C.blue : C.textSecondary,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  letterSpacing: "0.02em",
                  transition: "all 0.1s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {content}
      </a>
    );
  }
  return content;
}

export function News() {
  const { beginnerMode } = useBeginnerMode();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickerFilter, setTickerFilter] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(300);

  const load = useCallback(async () => {
    try {
      const data = await getNews(50);
      setNews(Array.isArray(data) ? data : []);
      setError(null);
      setLastUpdated(new Date());
      setSecondsUntilRefresh(300);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 300_000); // 5 min
    return () => clearInterval(interval);
  }, [load]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev <= 1 ? 300 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredNews = tickerFilter
    ? news.filter((n) => (n.tickers ?? []).includes(tickerFilter))
    : news;

  // Group by recency
  const groups: Record<string, NewsItem[]> = { "last-hour": [], today: [], earlier: [] };
  for (const item of filteredNews) {
    const g = getRecencyGroup(item.publishedAt);
    groups[g].push(item);
  }

  const nextRefreshMin = Math.ceil(secondsUntilRefresh / 60);

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Market News
          </h1>
          <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
            Live market news · refreshes every 5 minutes
            {lastUpdated && (
              <span style={{ color: "#2a3a50", marginLeft: 10 }}>
                · next in {nextRefreshMin}m
              </span>
            )}
          </p>
        </div>
        {tickerFilter && (
          <button
            onClick={() => setTickerFilter(null)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${C.blue}55`,
              background: `${C.blue}18`,
              color: C.blue,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "monospace" }}>{tickerFilter}</span>
            <span>× Clear filter</span>
          </button>
        )}
      </div>

      {error && <ErrorBanner message={`Failed to load news: ${error}`} onRetry={load} />}

      {beginnerMode && (
        <div
          style={{
            padding: "10px 14px",
            background: `${C.blue}0d`,
            border: `1px solid ${C.blue}22`,
            borderRadius: 8,
            fontSize: 12,
            color: C.textSecondary,
            marginBottom: 20,
          }}
        >
          📚 <strong>Beginner tip:</strong> Market news shows events that move prices. Sentiment badges (Bullish/Bearish) indicate whether the news is positive or negative for markets. Click ticker symbols to filter signals for that stock.
        </div>
      )}

      {loading && news.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height={90} />)}
        </div>
      ) : filteredNews.length === 0 ? (
        <EmptyState
          icon="📰"
          title={tickerFilter ? `No news for ${tickerFilter}` : "No news available"}
          subtitle={tickerFilter ? "Try clearing the ticker filter." : "News will appear here once the news pipeline collects data."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {GROUP_ORDER.map((groupKey) => {
            const items = groups[groupKey];
            if (items.length === 0) return null;
            return (
              <div key={groupKey}>
                {/* Group label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {GROUP_LABELS[groupKey]}
                  </span>
                  <span
                    style={{
                      background: "#1e293b",
                      color: C.textMuted,
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontWeight: 600,
                    }}
                  >
                    {items.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* News cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      tickerFilter={tickerFilter}
                      onTickerClick={(t) => setTickerFilter(t || null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 16 }}>
        {filteredNews.length} article{filteredNews.length !== 1 ? "s" : ""}
        {tickerFilter ? ` for ${tickerFilter}` : ""} · Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}
