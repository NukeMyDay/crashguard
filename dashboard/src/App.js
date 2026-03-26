import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Overview } from "./pages/Overview.js";
import { Signals } from "./pages/Signals.js";
import { Scanner } from "./pages/Scanner.js";
import { Strategies } from "./pages/Strategies.js";
import { Portfolio } from "./pages/Portfolio.js";
import { History } from "./pages/History.js";
function getHashRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const valid = ["/", "/signals", "/scanner", "/strategies", "/portfolio", "/history"];
    return valid.includes(hash) ? hash : "/";
}
function useHashRoute() {
    const [route, setRoute] = useState(getHashRoute);
    useEffect(() => {
        function onHashChange() {
            setRoute(getHashRoute());
        }
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);
    function navigate(r) {
        window.location.hash = r;
        setRoute(r);
    }
    return [route, navigate];
}
const NAV_ITEMS = [
    { route: "/", label: "Overview", icon: "📊" },
    { route: "/signals", label: "Signals", icon: "📈" },
    { route: "/scanner", label: "Scanner", icon: "🔍" },
    { route: "/strategies", label: "Strategies", icon: "🎯" },
    { route: "/portfolio", label: "Portfolio", icon: "💼" },
    { route: "/history", label: "History", icon: "📅" },
];
// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ route, navigate, }) {
    const [hovered, setHovered] = useState(null);
    return (_jsxs("aside", { style: {
            width: 240,
            minWidth: 240,
            background: "#0d1117",
            borderRight: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            position: "sticky",
            top: 0,
            flexShrink: 0,
        }, children: [_jsx("div", { style: {
                    padding: "24px 20px 20px",
                    borderBottom: "1px solid #1e293b",
                }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("div", { style: {
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                flexShrink: 0,
                            }, children: "\uD83D\uDCE1" }), _jsxs("div", { children: [_jsx("div", { style: {
                                        color: "#f1f5f9",
                                        fontWeight: 700,
                                        fontSize: 15,
                                        letterSpacing: "-0.01em",
                                    }, children: "MarketPulse" }), _jsx("div", { style: { color: "#475569", fontSize: 11 }, children: "Crash Monitor" })] })] }) }), _jsx("nav", { style: { flex: 1, padding: "12px 10px", overflowY: "auto" }, children: NAV_ITEMS.map((item) => {
                    const isActive = route === item.route;
                    const isHovered = hovered === item.route;
                    return (_jsxs("button", { onClick: () => navigate(item.route), onMouseEnter: () => setHovered(item.route), onMouseLeave: () => setHovered(null), style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: isActive ? "1px solid #6366f133" : "1px solid transparent",
                            background: isActive
                                ? "#6366f11a"
                                : isHovered
                                    ? "#ffffff08"
                                    : "transparent",
                            color: isActive ? "#818cf8" : isHovered ? "#cbd5e1" : "#64748b",
                            cursor: "pointer",
                            textAlign: "left",
                            fontWeight: isActive ? 600 : 400,
                            fontSize: 14,
                            transition: "all 0.15s ease",
                            marginBottom: 2,
                        }, children: [_jsx("span", { style: {
                                    fontSize: 15,
                                    width: 20,
                                    textAlign: "center",
                                    flexShrink: 0,
                                }, children: item.icon }), _jsx("span", { children: item.label }), isActive && (_jsx("span", { style: {
                                    marginLeft: "auto",
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    background: "#6366f1",
                                    flexShrink: 0,
                                } }))] }, item.route));
                }) }), _jsxs("div", { style: {
                    padding: "14px 18px",
                    borderTop: "1px solid #1e293b",
                }, children: [_jsx("div", { style: { color: "#334155", fontSize: 11 }, children: "MarketPulse v1.0" }), _jsxs("div", { style: { color: "#1e293b", fontSize: 10, marginTop: 2 }, children: [new Date().getFullYear(), " Real-time monitoring"] })] })] }));
}
// ---------------------------------------------------------------------------
// Page router
// ---------------------------------------------------------------------------
function PageContent({ route }) {
    switch (route) {
        case "/":
            return _jsx(Overview, {});
        case "/signals":
            return _jsx(Signals, {});
        case "/scanner":
            return _jsx(Scanner, {});
        case "/strategies":
            return _jsx(Strategies, {});
        case "/portfolio":
            return _jsx(Portfolio, {});
        case "/history":
            return _jsx(History, {});
        default:
            return _jsx(Overview, {});
    }
}
// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
function App() {
    const [route, navigate] = useHashRoute();
    return (_jsxs("div", { style: {
            display: "flex",
            minHeight: "100vh",
            background: "#0a0e1a",
            color: "#e2e8f0",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }, children: [_jsx(Sidebar, { route: route, navigate: navigate }), _jsx("main", { style: {
                    flex: 1,
                    minWidth: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                }, children: _jsx(PageContent, { route: route }) })] }));
}
export default App;
