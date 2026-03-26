import { useEffect, useState } from "react";
import { Overview } from "./pages/Overview.js";
import { Signals } from "./pages/Signals.js";
import { Scanner } from "./pages/Scanner.js";
import { Strategies } from "./pages/Strategies.js";
import { Portfolio } from "./pages/Portfolio.js";
import { History } from "./pages/History.js";
import { BeginnerModeProvider, useBeginnerMode, C } from "./context.js";

// ---------------------------------------------------------------------------
// Hash-based routing
// ---------------------------------------------------------------------------

type Route = "/" | "/signals" | "/scanner" | "/strategies" | "/portfolio" | "/history";

function getHashRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const valid: Route[] = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/history"];
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

  // Keyboard shortcuts: 1–6
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const routes: Route[] = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/history"];
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
  { route: "/history", label: "History", icon: "📅", shortcut: "6" },
];

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
// Beginner Mode Toggle
// ---------------------------------------------------------------------------

function BeginnerModeToggle() {
  const { beginnerMode, toggleBeginnerMode } = useBeginnerMode();

  return (
    <button
      onClick={toggleBeginnerMode}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 20,
        border: `1px solid ${beginnerMode ? C.blue + "88" : C.border}`,
        background: beginnerMode ? C.blue + "1a" : "transparent",
        color: beginnerMode ? C.blue : C.textMuted,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <span>🎓</span>
      <span>Beginner Mode {beginnerMode ? "ON" : "OFF"}</span>
    </button>
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
          Press 1–6 to navigate
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
    "/history": "Historical Analysis",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: `1px solid ${C.border}`,
        background: "#0b0f18",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>MarketPulse</span>
        <span style={{ color: "#2a3a50", fontSize: 13 }}>/</span>
        <span style={{ color: C.textPrimary, fontSize: 13, fontWeight: 500 }}>
          {pageLabels[route]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <AutoRefreshIndicator />
        <BeginnerModeToggle />
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
    case "/history":
      return <History />;
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
    <BeginnerModeProvider>
      <AppInner />
    </BeginnerModeProvider>
  );
}

export default App;
