import { useEffect, useState } from "react";
import { Overview } from "./pages/Overview.js";
import { Signals } from "./pages/Signals.js";
import { Scanner } from "./pages/Scanner.js";
import { Strategies } from "./pages/Strategies.js";
import { Portfolio } from "./pages/Portfolio.js";
import { History } from "./pages/History.js";
import { News } from "./pages/News.js";
import { Watchlist } from "./pages/Watchlist.js";
import { Settings } from "./pages/Settings.js";
import { Backtest } from "./pages/Backtest.js";
import { ExpertiseLevelProvider, useExpertise, C } from "./context.js";
import { ChatPanel } from "./components/ChatPanel.js";

// ---------------------------------------------------------------------------
// Hash-based routing
// ---------------------------------------------------------------------------

type Route = "/" | "/signals" | "/scanner" | "/strategies" | "/portfolio" | "/watchlist" | "/history" | "/news" | "/settings" | "/backtest";

function getHashRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const valid: Route[] = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
  return valid.includes(hash as Route) ? (hash as Route) : "/";
}

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(getHashRoute);

  useEffect(() => {
    function onHashChange() {
      setRoute(getHashRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keyboard shortcuts: 1–7
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const routes: Route[] = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/watchlist", "/history", "/news", "/settings", "/backtest"];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < routes.length) {
        navigate(routes[idx]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(r: Route) {
    window.location.hash = r;
    setRoute(r);
  }

  return [route, navigate];
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

interface NavItem {
  route: Route;
  label: string;
  icon: string;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: "/", label: "Overview", icon: "📊", shortcut: "1" },
  { route: "/signals", label: "Signals", icon: "📈", shortcut: "2" },
  { route: "/scanner", label: "Scanner", icon: "🔍", shortcut: "3" },
  { route: "/strategies", label: "Strategies", icon: "🎯", shortcut: "4" },
  { route: "/portfolio", label: "Portfolio", icon: "💼", shortcut: "5" },
  { route: "/watchlist", label: "Watchlist", icon: "👁", shortcut: "6" },
  { route: "/history", label: "History", icon: "📅", shortcut: "7" },
  { route: "/news", label: "News", icon: "📰", shortcut: "8" },
  { route: "/backtest", label: "Backtest", icon: "⏱️", shortcut: "9" },
  { route: "/settings", label: "Settings", icon: "⚙️", shortcut: "0" },
];

// ---------------------------------------------------------------------------
// Market clock + status
// ---------------------------------------------------------------------------

interface MarketStatus {
  label: string;
  tz: string;
  openHour: number;  // UTC open
  closeHour: number; // UTC close
  days: number[];    // 1=Mon..5=Fri
}

const MARKETS: MarketStatus[] = [
  { label: "US", tz: "EST", openHour: 14, closeHour: 21, days: [1, 2, 3, 4, 5] },   // 9:30–16:00 EST = 14:30–21:00 UTC approx
  { label: "EU", tz: "CET", openHour: 8, closeHour: 16, days: [1, 2, 3, 4, 5] },    // 9:00–17:00 CET = 8:00–16:00 UTC
  { label: "AS", tz: "JST", openHour: 0, closeHour: 6, days: [1, 2, 3, 4, 5] },     // 9:00–15:00 JST = 0:00–6:00 UTC
];

function getMarketState(market: MarketStatus, now: Date): "open" | "pre" | "closed" {
  const day = now.getUTCDay(); // 0=Sun, 1=Mon..5=Fri, 6=Sat
  const hour = now.getUTCHours();
  if (!market.days.includes(day)) return "closed";
  if (hour >= market.openHour && hour < market.closeHour) return "open";
  if (hour >= market.openHour - 1 && hour < market.openHour) return "pre";
  return "closed";
}

function MarketStatusBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  const utcTime = now.toUTCString().slice(17, 22) + " UTC";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: C.textMuted, fontSize: 11, fontFamily: "monospace" }}>{utcTime}</span>
      <span style={{ color: "#1e293b" }}>|</span>
      {MARKETS.map((m) => {
        const state = getMarketState(m, now);
        const color = state === "open" ? C.green : state === "pre" ? C.amber : "#2a3a50";
        const label = state === "open" ? "Open" : state === "pre" ? "Pre" : "Closed";
        return (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 5, height: 5, borderRadius: "50%", background: color,
                boxShadow: state === "open" ? `0 0 5px ${color}` : "none",
              }}
            />
            <span style={{ color: state === "open" ? C.textSecondary : "#2a3a50", fontSize: 11, fontWeight: state === "open" ? 600 : 400 }}>
              {m.label}
              <span style={{ color, marginLeft: 2, fontSize: 10 }}>{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-refresh header
// ---------------------------------------------------------------------------

function AutoRefreshIndicator() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastUpdated] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const status = secondsAgo > 300 ? "error" : secondsAgo > 90 ? "stale" : "live";
  const dotColor = status === "live" ? C.green : status === "stale" ? C.amber : C.red;

  const label =
    secondsAgo < 5
      ? "Just updated"
      : secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: status === "live" ? `0 0 6px ${dotColor}` : "none",
        }}
      />
      <span style={{ color: C.textMuted, fontSize: 12 }}>
        {status === "live" ? "Live" : status === "stale" ? "Stale" : "Error"} · {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expertise Level Selector (3-way segmented control)
// ---------------------------------------------------------------------------

const EXPERTISE_OPTIONS = [
  { value: "beginner" as const, icon: "🎓", label: "Beginner" },
  { value: "intermediate" as const, icon: "📊", label: "Intermediate" },
  { value: "professional" as const, icon: "⚡", label: "Professional" },
];

function ExpertiseLevelSelector() {
  const { level, setLevel } = useExpertise();

  return (
    <div
      style={{
        display: "flex",
        background: "#0d1424",
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: 2,
        gap: 2,
      }}
    >
      {EXPERTISE_OPTIONS.map((opt) => {
        const isActive = level === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setLevel(opt.value)}
            title={opt.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 18,
              border: "none",
              background: isActive ? C.blue + "33" : "transparent",
              color: isActive ? C.blue : C.textMuted,
              fontSize: 11,
              fontWeight: isActive ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span>{opt.icon}</span>
            {/* Show label on wider screens via inline style trick — always show on lg */}
            <span className="expertise-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  const [hovered, setHovered] = useState<Route | null>(null);

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "#080c13",
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            📡
          </div>
          <div>
            <div style={{ color: C.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              MarketPulse
            </div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Crash Monitor</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = route === item.route;
          const isHov = hovered === item.route;
          return (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              onMouseEnter={() => setHovered(item.route)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: isActive ? `1px solid ${C.blue}33` : "1px solid transparent",
                background: isActive ? `${C.blue}18` : isHov ? "#ffffff08" : "transparent",
                color: isActive ? C.blue : isHov ? C.textSecondary : "#64748b",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: "all 0.12s ease",
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {!isActive && (
                <span style={{ color: "#2a3a50", fontSize: 10, fontWeight: 500 }}>
                  {item.shortcut}
                </span>
              )}
              {isActive && (
                <div
                  style={{
                    width: 4,
                    height: 16,
                    borderRadius: 2,
                    background: C.blue,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: "#1e293b", fontSize: 11 }}>MarketPulse v1.0</div>
        <div style={{ color: "#131d2e", fontSize: 10, marginTop: 1 }}>
          Press 1–9 to navigate
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top header
// ---------------------------------------------------------------------------

function TopHeader({ route }: { route: Route }) {
  const pageLabels: Record<Route, string> = {
    "/": "Overview",
    "/signals": "Signals",
    "/scanner": "Market Scanner",
    "/strategies": "Strategies",
    "/portfolio": "Portfolio",
    "/watchlist": "Watchlist",
    "/history": "Historical Analysis",
    "/news": "News Feed",
    "/backtest": "Backtesting Engine",
    "/settings": "Settings",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        borderBottom: `1px solid ${C.border}`,
        background: "#0b0f18",
        flexShrink: 0,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>MarketPulse</span>
        <span style={{ color: "#2a3a50", fontSize: 13 }}>/</span>
        <span style={{ color: C.textPrimary, fontSize: 13, fontWeight: 500 }}>
          {pageLabels[route]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <MarketStatusBar />
        <AutoRefreshIndicator />
        <ExpertiseLevelSelector />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page router
// ---------------------------------------------------------------------------

function PageContent({ route }: { route: Route }) {
  switch (route) {
    case "/":
      return <Overview />;
    case "/signals":
      return <Signals />;
    case "/scanner":
      return <Scanner />;
    case "/strategies":
      return <Strategies />;
    case "/portfolio":
      return <Portfolio />;
    case "/watchlist":
      return <Watchlist />;
    case "/history":
      return <History />;
    case "/news":
      return <News />;
    case "/backtest":
      return <Backtest />;
    case "/settings":
      return <Settings />;
    default:
      return <Overview />;
  }
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

function AppInner() {
  const [route, navigate] = useHashRoute();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.bg,
        color: C.textPrimary,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <Sidebar route={route} navigate={navigate} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopHeader route={route} />
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <PageContent route={route} />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ExpertiseLevelProvider>
      <AppInner />
      <ChatPanel />
    </ExpertiseLevelProvider>
  );
}

export default App;
