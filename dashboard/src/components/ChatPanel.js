import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from "react";
import { C } from "../context.js";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = "mp_chat_history";
const MAX_STORED = 50;
const STARTER_PROMPTS = [
    "Why is the crash score at its current level?",
    "What are the best signals right now?",
    "Explain what the Fear & Greed Index means",
    "What should I watch out for today?",
];
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
    catch {
        return [];
    }
}
function saveHistory(messages) {
    try {
        const toStore = messages.slice(-MAX_STORED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
    catch {
        // ignore storage errors
    }
}
function formatTime(d) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function genId() {
    return Math.random().toString(36).slice(2);
}
// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingDots() {
    return (_jsx("div", { style: { display: "flex", gap: 4, padding: "12px 16px", alignItems: "center" }, children: [0, 1, 2].map((i) => (_jsx("div", { style: {
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: C.textMuted,
                animation: `mp-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            } }, i))) }));
}
// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ msg }) {
    const isUser = msg.role === "user";
    return (_jsxs("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: isUser ? "flex-end" : "flex-start",
            marginBottom: 12,
        }, children: [_jsx("div", { style: {
                    maxWidth: "82%",
                    padding: "10px 14px",
                    background: isUser ? "#3b82f6" : "#1e293b",
                    color: isUser ? "#fff" : C.textSecondary,
                    borderRadius: isUser
                        ? "14px 4px 14px 14px"
                        : "4px 14px 14px 14px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }, children: msg.content }), _jsx("div", { style: { color: C.textMuted, fontSize: 10, marginTop: 3, paddingLeft: 4, paddingRight: 4 }, children: formatTime(msg.timestamp) })] }));
}
// ---------------------------------------------------------------------------
// Followup chips
// ---------------------------------------------------------------------------
function FollowupChips({ chips, onSelect }) {
    if (!chips.length)
        return null;
    return (_jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, padding: "0 12px 12px" }, children: chips.map((c) => (_jsx("button", { onClick: () => onSelect(c), style: {
                padding: "5px 10px",
                borderRadius: 20,
                border: `1px solid ${C.blue}55`,
                background: `${C.blue}15`,
                color: C.blue,
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.12s ease",
            }, children: c }, c))) }));
}
// ---------------------------------------------------------------------------
// Starter prompt chips
// ---------------------------------------------------------------------------
function StarterChips({ onSelect }) {
    return (_jsxs("div", { style: { padding: "12px 16px 0" }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginBottom: 8 }, children: "Suggested questions:" }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: STARTER_PROMPTS.map((p) => (_jsx("button", { onClick: () => onSelect(p), style: {
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: "#1e293b",
                        color: C.textSecondary,
                        fontSize: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                    }, children: p }, p))) })] }));
}
// ---------------------------------------------------------------------------
// Main ChatPanel
// ---------------------------------------------------------------------------
export function ChatPanel({ pageContext: pageContextProp }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.replace(/^#/, "") || "/");
    const pageContext = pageContextProp ?? currentRoute;
    useEffect(() => {
        function onHashChange() {
            setCurrentRoute(window.location.hash.replace(/^#/, "") || "/");
        }
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);
    const [messages, setMessages] = useState(loadHistory);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    // Track mobile viewport
    useEffect(() => {
        function onResize() {
            setIsMobile(window.innerWidth < 640);
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    // ESC to close
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === "Escape" && isOpen)
                setIsOpen(false);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen]);
    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);
    // Persist history
    useEffect(() => {
        saveHistory(messages);
    }, [messages]);
    // Clear new-message badge when panel opens
    useEffect(() => {
        if (isOpen)
            setHasNewMessage(false);
    }, [isOpen]);
    const sendMessage = useCallback(async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading)
            return;
        const userMsg = {
            id: genId(),
            role: "user",
            content: trimmed,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
        try {
            const res = await fetch("/v1/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, pageContext }),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const assistantMsg = {
                id: genId(),
                role: "assistant",
                content: data.reply ?? "No response received.",
                timestamp: new Date(),
                suggestedFollowups: data.suggestedFollowups ?? [],
            };
            setMessages((prev) => [...prev, assistantMsg]);
            if (!isOpen)
                setHasNewMessage(true);
        }
        catch (err) {
            const errorMsg = {
                id: genId(),
                role: "assistant",
                content: "Sorry, I couldn't reach the AI assistant right now. The backend endpoint may not be available yet.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        }
        finally {
            setIsLoading(false);
        }
    }, [isLoading, isOpen, pageContext]);
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    }
    function handleTextareaInput(e) {
        setInputValue(e.target.value);
        // Auto-expand
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
    function clearChat() {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
    }
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    // -------------------------------------------------------------------------
    // Panel dimensions
    // -------------------------------------------------------------------------
    const panelStyle = isMobile
        ? {
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "#0f1629",
            display: "flex",
            flexDirection: "column",
        }
        : {
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 400,
            zIndex: 1000,
            background: "#0f1629",
            borderLeft: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @keyframes mp-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes mp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      ` }), _jsxs("button", { onClick: () => setIsOpen((o) => !o), "aria-label": "Open AI Chat", style: {
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    zIndex: 999,
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    boxShadow: "0 4px 20px rgba(59,130,246,0.5)",
                    transition: "transform 0.15s ease",
                }, onMouseEnter: (e) => (e.currentTarget.style.transform = "scale(1.08)"), onMouseLeave: (e) => (e.currentTarget.style.transform = "scale(1)"), children: ["\uD83D\uDCAC", hasNewMessage && (_jsx("span", { style: {
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: C.red,
                            animation: "mp-pulse 1.5s ease-in-out infinite",
                        } }))] }), isOpen && (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            padding: "14px 16px",
                            borderBottom: `1px solid ${C.border}`,
                            flexShrink: 0,
                            gap: 10,
                        }, children: [_jsxs("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { fontSize: 18 }, children: "\uD83E\uDD16" }), _jsx("span", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 14 }, children: "MarketPulse AI" }), messages.length > 0 && (_jsx("span", { style: {
                                            background: `${C.blue}33`,
                                            color: C.blue,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            padding: "1px 7px",
                                            borderRadius: 10,
                                            border: `1px solid ${C.blue}44`,
                                        }, children: messages.length }))] }), _jsx("button", { onClick: clearChat, style: {
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: `1px solid ${C.border}`,
                                    background: "transparent",
                                    color: C.textMuted,
                                    fontSize: 11,
                                    cursor: "pointer",
                                }, children: "New Chat" }), _jsx("button", { onClick: () => setIsOpen(false), "aria-label": "Close panel", style: {
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: `1px solid ${C.border}`,
                                    background: "transparent",
                                    color: C.textMuted,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                }, children: "\u2715" })] }), _jsxs("div", { style: {
                            flex: 1,
                            overflowY: "auto",
                            padding: "16px 12px 0",
                            display: "flex",
                            flexDirection: "column",
                        }, children: [messages.length === 0 && !isLoading ? (_jsx(StarterChips, { onSelect: (t) => sendMessage(t) })) : (_jsxs(_Fragment, { children: [messages.map((msg) => (_jsx(MessageBubble, { msg: msg }, msg.id))), isLoading && _jsx(TypingDots, {}), !isLoading && lastAssistantMsg?.suggestedFollowups?.length ? (_jsx(FollowupChips, { chips: lastAssistantMsg.suggestedFollowups, onSelect: (t) => sendMessage(t) })) : null] })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { style: {
                            padding: "12px",
                            borderTop: `1px solid ${C.border}`,
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-end",
                            flexShrink: 0,
                        }, children: [_jsx("textarea", { ref: textareaRef, value: inputValue, onChange: handleTextareaInput, onKeyDown: handleKeyDown, placeholder: "Ask about market conditions\u2026", rows: 1, style: {
                                    flex: 1,
                                    resize: "none",
                                    background: "#1e293b",
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                    color: C.textPrimary,
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    outline: "none",
                                    lineHeight: 1.5,
                                    overflow: "hidden",
                                    maxHeight: 120,
                                } }), _jsx("button", { onClick: () => sendMessage(inputValue), disabled: isLoading || !inputValue.trim(), style: {
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: inputValue.trim() && !isLoading ? "#3b82f6" : "#1e293b",
                                    border: `1px solid ${inputValue.trim() && !isLoading ? "#3b82f6" : C.border}`,
                                    color: inputValue.trim() && !isLoading ? "#fff" : C.textMuted,
                                    cursor: inputValue.trim() && !isLoading ? "pointer" : "not-allowed",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    flexShrink: 0,
                                    transition: "all 0.12s ease",
                                }, "aria-label": "Send message", children: "\u27A4" })] })] }))] }));
}
