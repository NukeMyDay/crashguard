import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { C, useExpertise } from "../context.js";
import { fetchJSON, getWebhooks, addWebhook, deleteWebhook, testWebhookUrl } from "../api.js";
import { resetTour } from "../components/OnboardingTour.js";
function WebhookSection() {
    const [webhooks, setWebhooks] = useState([]);
    const [loadingHooks, setLoadingHooks] = useState(true);
    const [url, setUrl] = useState("");
    const [severity, setSeverity] = useState("critical");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [testingId, setTestingId] = useState(null);
    const [testResults, setTestResults] = useState({});
    async function load() {
        try {
            const data = await getWebhooks();
            setWebhooks(Array.isArray(data) ? data : []);
        }
        catch {
            setWebhooks([]);
        }
        finally {
            setLoadingHooks(false);
        }
    }
    useEffect(() => { load(); }, []);
    async function handleAdd() {
        if (!url.trim())
            return;
        setAdding(true);
        setAddError(null);
        try {
            await addWebhook(url.trim(), severity);
            setUrl("");
            await load();
        }
        catch (e) {
            setAddError(String(e));
        }
        finally {
            setAdding(false);
        }
    }
    async function handleDelete(id) {
        setDeletingId(id);
        try {
            await deleteWebhook(id);
            await load();
        }
        catch { /* ignore */ }
        finally {
            setDeletingId(null);
        }
    }
    async function handleTest(webhook) {
        setTestingId(webhook.id);
        try {
            const res = await testWebhookUrl(webhook.url);
            setTestResults((prev) => ({ ...prev, [webhook.id]: { ok: true, msg: res?.message ?? "Ping sent" } }));
        }
        catch (e) {
            setTestResults((prev) => ({ ...prev, [webhook.id]: { ok: false, msg: String(e) } }));
        }
        finally {
            setTestingId(null);
        }
    }
    const inputStyle = {
        background: "#0a0e17",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "9px 12px",
        color: C.textPrimary,
        fontSize: 13,
        outline: "none",
    };
    const severityColors = {
        warning: C.amber,
        critical: C.red,
        extreme: "#dc2626",
    };
    return (_jsxs("div", { style: {
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginTop: 16,
        }, children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: "Alert Webhooks" }), _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginBottom: 20 }, children: "Receive HTTP POST notifications when crash alerts are triggered." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }, children: [_jsx("input", { type: "url", placeholder: "https://hooks.example.com/...", value: url, onChange: (e) => { setUrl(e.target.value); setAddError(null); }, style: { ...inputStyle, flex: 1, minWidth: 200 } }), _jsxs("select", { value: severity, onChange: (e) => setSeverity(e.target.value), style: { ...inputStyle, width: 120 }, children: [_jsx("option", { value: "warning", children: "Warning" }), _jsx("option", { value: "critical", children: "Critical" }), _jsx("option", { value: "extreme", children: "Extreme" })] }), _jsx("button", { onClick: handleAdd, disabled: adding || !url.trim(), style: {
                            padding: "9px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: url.trim() && !adding ? C.blue : "#1e293b",
                            color: url.trim() && !adding ? "#fff" : C.textMuted,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: url.trim() && !adding ? "pointer" : "not-allowed",
                            transition: "background 0.15s",
                            whiteSpace: "nowrap",
                        }, children: adding ? "Adding…" : "Add Webhook" })] }), addError && (_jsxs("div", { style: { color: C.red, fontSize: 12, marginBottom: 12 }, children: ["Error: ", addError] })), loadingHooks ? (_jsx("div", { style: { color: C.textMuted, fontSize: 13 }, children: "Loading\u2026" })) : webhooks.length === 0 ? (_jsx("div", { style: { color: C.textMuted, fontSize: 13, padding: "16px 0" }, children: "No webhooks configured yet." })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: webhooks.map((wh) => {
                    const sc = severityColors[wh.severity] ?? C.textMuted;
                    const testRes = testResults[wh.id];
                    return (_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            background: "#0a0e17",
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            flexWrap: "wrap",
                        }, children: [_jsx("span", { style: {
                                    color: sc,
                                    background: sc + "18",
                                    border: `1px solid ${sc}44`,
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    flexShrink: 0,
                                }, children: wh.severity }), _jsx("span", { style: {
                                    flex: 1,
                                    fontSize: 12,
                                    fontFamily: "monospace",
                                    color: C.textSecondary,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    minWidth: 0,
                                }, children: wh.url }), testRes && (_jsxs("span", { style: { fontSize: 11, color: testRes.ok ? C.green : C.red, flexShrink: 0 }, children: [testRes.ok ? "✓" : "✗", " ", testRes.msg] })), _jsx("button", { onClick: () => handleTest(wh), disabled: testingId === wh.id, style: {
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: `1px solid ${C.border}`,
                                    background: "transparent",
                                    color: C.textMuted,
                                    fontSize: 11,
                                    cursor: testingId === wh.id ? "not-allowed" : "pointer",
                                    flexShrink: 0,
                                }, children: testingId === wh.id ? "Testing…" : "Test" }), _jsx("button", { onClick: () => handleDelete(wh.id), disabled: deletingId === wh.id, style: {
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: `1px solid ${C.red}44`,
                                    background: `${C.red}0d`,
                                    color: "#fca5a5",
                                    fontSize: 11,
                                    cursor: deletingId === wh.id ? "not-allowed" : "pointer",
                                    flexShrink: 0,
                                }, children: deletingId === wh.id ? "…" : "Delete" })] }, wh.id));
                }) }))] }));
}
// ─── Settings Page ────────────────────────────────────────────────────────────
export function Settings() {
    const { level, setLevel } = useExpertise();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    // API key form
    const [keyInput, setKeyInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    // Test connection
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    // Usage tracking from rate limit map (not available from backend, just display daily limit info)
    useEffect(() => {
        fetchJSON("/settings")
            .then(setSettings)
            .catch(() => setSettings(null))
            .finally(() => setLoading(false));
    }, []);
    async function handleSave() {
        if (!keyInput.trim())
            return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);
        setTestResult(null);
        try {
            await fetchJSON("/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ anthropicApiKey: keyInput.trim() }),
            });
            setSaveSuccess(true);
            setKeyInput("");
            // Refresh displayed settings
            const updated = await fetchJSON("/settings");
            setSettings(updated);
        }
        catch (err) {
            setSaveError(String(err));
        }
        finally {
            setSaving(false);
        }
    }
    async function handleTest() {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetchJSON("/settings/test", {
                method: "POST",
            });
            setTestResult(res.success ? { ok: true, message: "Connected successfully" } : { ok: false, message: res.error ?? "Test failed" });
        }
        catch (err) {
            setTestResult({ ok: false, message: String(err) });
        }
        finally {
            setTesting(false);
        }
    }
    const isConfigured = settings?.anthropicApiKey?.configured ?? false;
    return (_jsxs("div", { style: { padding: "28px 32px", maxWidth: 680 }, children: [_jsx("h1", { style: {
                    color: C.textPrimary,
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                }, children: "Settings" }), _jsx("p", { style: { color: C.textMuted, fontSize: 13, marginBottom: 28 }, children: "Configure API keys and application preferences." }), _jsxs("div", { style: {
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 16,
                }, children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: "Interface Mode" }), _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginBottom: 20 }, children: "Choose how much detail and explanation you want across the dashboard." }), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
                            {
                                value: "beginner",
                                icon: "🎓",
                                title: "Beginner",
                                desc: "Full explanations, plain English, guided tooltips. Best for new investors learning the ropes.",
                                preview: 'Shows "What does this mean?" panels, plain-English market summaries, and Why It Matters columns.',
                            },
                            {
                                value: "intermediate",
                                icon: "📊",
                                title: "Intermediate",
                                desc: "Balanced view with key context and standard labels. The default experience.",
                                preview: "Standard charts and tables with optional tooltips. Clean and efficient.",
                            },
                            {
                                value: "professional",
                                icon: "⚡",
                                title: "Professional",
                                desc: "Dense data mode — maximum information density, no hand-holding.",
                                preview: "Compact tables, raw decimal values, table-only signal view, dense score grids.",
                            },
                        ].map((opt) => {
                            const isActive = level === opt.value;
                            return (_jsxs("div", { onClick: () => setLevel(opt.value), style: {
                                    padding: "14px 16px",
                                    borderRadius: 10,
                                    border: `1px solid ${isActive ? C.blue + "88" : C.border}`,
                                    background: isActive ? `${C.blue}0f` : "#0a0e17",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 14,
                                }, children: [_jsx("div", { style: {
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            background: isActive ? `${C.blue}22` : "#1e293b",
                                            border: `1px solid ${isActive ? C.blue + "55" : C.border}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 18,
                                            flexShrink: 0,
                                        }, children: opt.icon }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { color: isActive ? C.blue : C.textPrimary, fontWeight: 600, fontSize: 14 }, children: opt.title }), isActive && (_jsx("span", { style: {
                                                            color: C.blue,
                                                            background: `${C.blue}18`,
                                                            border: `1px solid ${C.blue}44`,
                                                            borderRadius: 10,
                                                            padding: "1px 8px",
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                        }, children: "ACTIVE" }))] }), _jsx("div", { style: { color: C.textSecondary, fontSize: 13, marginBottom: 4 }, children: opt.desc }), _jsx("div", { style: { color: C.textMuted, fontSize: 11 }, children: opt.preview })] })] }, opt.value));
                        }) })] }), _jsxs("div", { style: {
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 24,
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 16,
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15 }, children: "Anthropic API Key" }), _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 2 }, children: "Required for the AI chat assistant. Stored encrypted with AES-256-GCM." })] }), _jsx(StatusBadge, { loading: loading, configured: isConfigured })] }), !loading && isConfigured && settings?.anthropicApiKey?.maskedValue && (_jsxs("div", { style: {
                            background: "#0a0e17",
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }, children: [_jsx("span", { style: {
                                    fontFamily: "monospace",
                                    color: C.textSecondary,
                                    fontSize: 13,
                                    letterSpacing: "0.04em",
                                }, children: settings.anthropicApiKey.maskedValue }), settings.anthropicApiKey.updatedAt && (_jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: ["Updated", " ", new Date(settings.anthropicApiKey.updatedAt).toLocaleDateString()] }))] })), _jsxs("div", { style: { display: "flex", gap: 10, marginBottom: 12 }, children: [_jsx("input", { type: "password", placeholder: isConfigured ? "Enter new API key to replace…" : "sk-ant-api03-…", value: keyInput, onChange: (e) => {
                                    setKeyInput(e.currentTarget.value);
                                    setSaveSuccess(false);
                                    setSaveError(null);
                                }, onKeyDown: (e) => {
                                    if (e.key === "Enter")
                                        handleSave();
                                }, style: {
                                    flex: 1,
                                    padding: "9px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${C.border}`,
                                    background: "#0a0e17",
                                    color: C.textPrimary,
                                    fontSize: 13,
                                    fontFamily: "monospace",
                                    outline: "none",
                                } }), _jsx("button", { onClick: handleSave, disabled: saving || !keyInput.trim(), style: {
                                    padding: "9px 18px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: keyInput.trim() && !saving ? C.blue : "#1e293b",
                                    color: keyInput.trim() && !saving ? "#fff" : C.textMuted,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: keyInput.trim() && !saving ? "pointer" : "not-allowed",
                                    transition: "background 0.15s",
                                }, children: saving ? "Saving…" : "Save" })] }), saveSuccess && (_jsxs("div", { style: {
                            color: C.green,
                            fontSize: 13,
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }, children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "API key saved successfully." })] })), saveError && (_jsxs("div", { style: { color: C.red, fontSize: 13, marginBottom: 10 }, children: ["Error: ", saveError] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("button", { onClick: handleTest, disabled: testing || !isConfigured, style: {
                                    padding: "7px 14px",
                                    borderRadius: 7,
                                    border: `1px solid ${C.border}`,
                                    background: "transparent",
                                    color: isConfigured ? C.textSecondary : C.textMuted,
                                    fontSize: 12,
                                    cursor: isConfigured && !testing ? "pointer" : "not-allowed",
                                    transition: "all 0.12s",
                                }, children: testing ? "Testing…" : "Test connection" }), testResult && (_jsxs("span", { style: {
                                    fontSize: 13,
                                    color: testResult.ok ? C.green : C.red,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                }, children: [_jsx("span", { children: testResult.ok ? "✓" : "✗" }), _jsx("span", { children: testResult.message })] }))] }), _jsx("div", { style: {
                            marginTop: 18,
                            paddingTop: 16,
                            borderTop: `1px solid ${C.border}`,
                            color: C.textMuted,
                            fontSize: 12,
                        }, children: "Daily limit: 50 messages per IP. The key is never returned via the API \u2014 only a masked preview is shown." })] }), _jsxs("div", { style: {
                    marginTop: 16,
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: "#0a0e17",
                    color: C.textMuted,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                }, children: [_jsx("span", { style: { fontSize: 14, marginTop: 1 }, children: "\uD83D\uDD12" }), _jsxs("span", { children: ["Keys are encrypted with AES-256-GCM before storage. The encryption key is derived from", " ", _jsx("code", { style: {
                                    background: "#1e293b",
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    fontFamily: "monospace",
                                }, children: "ENCRYPTION_SECRET" }), " ", "on the server. Set this env var in production for maximum security."] })] }), _jsx(WebhookSection, {}), _jsxs("div", { style: {
                    marginTop: 16,
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 24,
                }, children: [
                    _jsx("div", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: "Onboarding Tour" }),
                    _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginBottom: 16 }, children: "Re-run the guided tour to learn about each dashboard feature." }),
                    _jsx("button", {
                        onClick: () => { resetTour(); window.location.hash = "/"; window.location.reload(); },
                        style: {
                            padding: "9px 18px",
                            borderRadius: 8,
                            border: `1px solid ${C.blue}55`,
                            background: `${C.blue}11`,
                            color: C.blue,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                        },
                        children: "🗺️ Take the Tour",
                    }),
                ] })] }));
}
// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ loading, configured, }) {
    if (loading) {
        return (_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: "Checking\u2026" }));
    }
    return (_jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 20,
            border: `1px solid ${configured ? C.green + "44" : C.amber + "44"}`,
            background: configured ? C.green + "11" : C.amber + "11",
        }, children: [_jsx("div", { style: {
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: configured ? C.green : C.amber,
                    boxShadow: `0 0 5px ${configured ? C.green : C.amber}`,
                } }), _jsx("span", { style: {
                    color: configured ? C.green : C.amber,
                    fontSize: 12,
                    fontWeight: 500,
                }, children: configured ? "Connected" : "Not configured" })] }));
}
