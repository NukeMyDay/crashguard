import { useState, useEffect } from "react";
import { C, useExpertise, ExpertiseLevel } from "../context.js";
import { fetchJSON, getWebhooks, addWebhook, deleteWebhook, testWebhookUrl } from "../api.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  anthropicApiKey: {
    configured: boolean;
    maskedValue: string | null;
    updatedAt: string | null;
  };
}

// ─── Webhook Settings ─────────────────────────────────────────────────────────

interface Webhook {
  id: string;
  url: string;
  severity: string;
  createdAt?: string;
}

function WebhookSection() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingHooks, setLoadingHooks] = useState(true);
  const [url, setUrl] = useState("");
  const [severity, setSeverity] = useState("critical");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  async function load() {
    try {
      const data = await getWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch {
      setWebhooks([]);
    } finally {
      setLoadingHooks(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!url.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await addWebhook(url.trim(), severity);
      setUrl("");
      await load();
    } catch (e) {
      setAddError(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteWebhook(id);
      await load();
    } catch { /* ignore */ } finally {
      setDeletingId(null);
    }
  }

  async function handleTest(webhook: Webhook) {
    setTestingId(webhook.id);
    try {
      const res = await testWebhookUrl(webhook.url);
      setTestResults((prev) => ({ ...prev, [webhook.id]: { ok: true, msg: res?.message ?? "Ping sent" } }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [webhook.id]: { ok: false, msg: String(e) } }));
    } finally {
      setTestingId(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "#0a0e17",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: C.textPrimary,
    fontSize: 13,
    outline: "none",
  };

  const severityColors: Record<string, string> = {
    warning: C.amber,
    critical: C.red,
    extreme: "#dc2626",
  };

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 24,
        marginTop: 16,
      }}
    >
      <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Alert Webhooks</div>
      <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 20 }}>
        Receive HTTP POST notifications when crash alerts are triggered.
      </div>

      {/* Add webhook form */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          type="url"
          placeholder="https://hooks.example.com/..."
          value={url}
          onChange={(e) => { setUrl(e.target.value); setAddError(null); }}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          style={{ ...inputStyle, width: 120 }}
        >
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="extreme">Extreme</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={adding || !url.trim()}
          style={{
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
          }}
        >
          {adding ? "Adding…" : "Add Webhook"}
        </button>
      </div>

      {addError && (
        <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>Error: {addError}</div>
      )}

      {/* Webhook list */}
      {loadingHooks ? (
        <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>
      ) : webhooks.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, padding: "16px 0" }}>No webhooks configured yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {webhooks.map((wh) => {
            const sc = severityColors[wh.severity] ?? C.textMuted;
            const testRes = testResults[wh.id];
            return (
              <div
                key={wh.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#0a0e17",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: sc,
                    background: sc + "18",
                    border: `1px solid ${sc}44`,
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {wh.severity}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: C.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {wh.url}
                </span>
                {testRes && (
                  <span style={{ fontSize: 11, color: testRes.ok ? C.green : C.red, flexShrink: 0 }}>
                    {testRes.ok ? "✓" : "✗"} {testRes.msg}
                  </span>
                )}
                <button
                  onClick={() => handleTest(wh)}
                  disabled={testingId === wh.id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: "transparent",
                    color: C.textMuted,
                    fontSize: 11,
                    cursor: testingId === wh.id ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {testingId === wh.id ? "Testing…" : "Test"}
                </button>
                <button
                  onClick={() => handleDelete(wh.id)}
                  disabled={deletingId === wh.id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${C.red}44`,
                    background: `${C.red}0d`,
                    color: "#fca5a5",
                    fontSize: 11,
                    cursor: deletingId === wh.id ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {deletingId === wh.id ? "…" : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function Settings() {
  const { level, setLevel } = useExpertise();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("mp_sound_alerts") !== "false"; } catch { return true; }
  });

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try { localStorage.setItem("mp_sound_alerts", next ? "true" : "false"); } catch {}
  }

  // API key form
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Usage tracking from rate limit map (not available from backend, just display daily limit info)
  useEffect(() => {
    fetchJSON<SettingsData>("/settings")
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!keyInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      await fetchJSON<{ success: boolean }>("/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: keyInput.trim() }),
      });
      setSaveSuccess(true);
      setKeyInput("");
      // Refresh displayed settings
      const updated = await fetchJSON<SettingsData>("/settings");
      setSettings(updated);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchJSON<{ success: boolean; error?: string }>("/settings/test", {
        method: "POST",
      });
      setTestResult(res.success ? { ok: true, message: "Connected successfully" } : { ok: false, message: res.error ?? "Test failed" });
    } catch (err) {
      setTestResult({ ok: false, message: String(err) });
    } finally {
      setTesting(false);
    }
  }

  const isConfigured = settings?.anthropicApiKey?.configured ?? false;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 680 }}>
      <h1
        style={{
          color: C.textPrimary,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        Settings
      </h1>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 28 }}>
        Configure API keys and application preferences.
      </p>

      {/* Interface Mode */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Interface Mode</div>
        <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 20 }}>
          Choose how much detail and explanation you want across the dashboard.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(
            [
              {
                value: "beginner" as ExpertiseLevel,
                icon: "🎓",
                title: "Beginner",
                desc: "Full explanations, plain English, guided tooltips. Best for new investors learning the ropes.",
                preview: 'Shows "What does this mean?" panels, plain-English market summaries, and Why It Matters columns.',
              },
              {
                value: "intermediate" as ExpertiseLevel,
                icon: "📊",
                title: "Intermediate",
                desc: "Balanced view with key context and standard labels. The default experience.",
                preview: "Standard charts and tables with optional tooltips. Clean and efficient.",
              },
              {
                value: "professional" as ExpertiseLevel,
                icon: "⚡",
                title: "Professional",
                desc: "Dense data mode — maximum information density, no hand-holding.",
                preview: "Compact tables, raw decimal values, table-only signal view, dense score grids.",
              },
            ] as { value: ExpertiseLevel; icon: string; title: string; desc: string; preview: string }[]
          ).map((opt) => {
            const isActive = level === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => setLevel(opt.value)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${isActive ? C.blue + "88" : C.border}`,
                  background: isActive ? `${C.blue}0f` : "#0a0e17",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                <div
                  style={{
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
                  }}
                >
                  {opt.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: isActive ? C.blue : C.textPrimary, fontWeight: 600, fontSize: 14 }}>
                      {opt.title}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          color: C.blue,
                          background: `${C.blue}18`,
                          border: `1px solid ${C.blue}44`,
                          borderRadius: 10,
                          padding: "1px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 4 }}>{opt.desc}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{opt.preview}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound Alerts */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {soundEnabled ? "🔔" : "🔕"} Sound Alerts
          </div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>
            Play audio when crash score crosses critical thresholds (Warning 50, Critical 75, Extreme 90).
            Requires first user interaction. Toggle with <strong style={{ color: C.textSecondary }}>S</strong> key.
          </div>
        </div>
        <button
          onClick={toggleSound}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: `1px solid ${soundEnabled ? C.green + "66" : C.border}`,
            background: soundEnabled ? `${C.green}18` : "#1e293b",
            color: soundEnabled ? C.green : C.textMuted,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {soundEnabled ? "On" : "Off"}
        </button>
      </div>

      {/* Anthropic API Key card */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15 }}
            >
              Anthropic API Key
            </div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
              Required for the AI chat assistant. Stored encrypted with AES-256-GCM.
            </div>
          </div>
          <StatusBadge loading={loading} configured={isConfigured} />
        </div>

        {/* Current key info */}
        {!loading && isConfigured && settings?.anthropicApiKey?.maskedValue && (
          <div
            style={{
              background: "#0a0e17",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                color: C.textSecondary,
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              {settings.anthropicApiKey.maskedValue}
            </span>
            {settings.anthropicApiKey.updatedAt && (
              <span style={{ color: C.textMuted, fontSize: 11 }}>
                Updated{" "}
                {new Date(settings.anthropicApiKey.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Input to set/update key */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="password"
            placeholder={isConfigured ? "Enter new API key to replace…" : "sk-ant-api03-…"}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.currentTarget.value);
              setSaveSuccess(false);
              setSaveError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "#0a0e17",
              color: C.textPrimary,
              fontSize: 13,
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !keyInput.trim()}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: keyInput.trim() && !saving ? C.blue : "#1e293b",
              color: keyInput.trim() && !saving ? "#fff" : C.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: keyInput.trim() && !saving ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Status messages */}
        {saveSuccess && (
          <div
            style={{
              color: C.green,
              fontSize: 13,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>✓</span>
            <span>API key saved successfully.</span>
          </div>
        )}
        {saveError && (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>
            Error: {saveError}
          </div>
        )}

        {/* Test connection */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleTest}
            disabled={testing || !isConfigured}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: isConfigured ? C.textSecondary : C.textMuted,
              fontSize: 12,
              cursor: isConfigured && !testing ? "pointer" : "not-allowed",
              transition: "all 0.12s",
            }}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          {testResult && (
            <span
              style={{
                fontSize: 13,
                color: testResult.ok ? C.green : C.red,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{testResult.ok ? "✓" : "✗"}</span>
              <span>{testResult.message}</span>
            </span>
          )}
        </div>

        {/* Usage note */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
            color: C.textMuted,
            fontSize: 12,
          }}
        >
          Daily limit: 50 messages per IP. The key is never returned via the API — only a masked preview is shown.
        </div>
      </div>

      {/* Security note */}
      <div
        style={{
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
        }}
      >
        <span style={{ fontSize: 14, marginTop: 1 }}>🔒</span>
        <span>
          Keys are encrypted with AES-256-GCM before storage. The encryption
          key is derived from{" "}
          <code
            style={{
              background: "#1e293b",
              padding: "1px 5px",
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          >
            ENCRYPTION_SECRET
          </code>{" "}
          on the server. Set this env var in production for maximum security.
        </span>
      </div>

      {/* Webhooks */}
      <WebhookSection />
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  loading,
  configured,
}: {
  loading: boolean;
  configured: boolean;
}) {
  if (loading) {
    return (
      <span style={{ color: C.textMuted, fontSize: 12 }}>Checking…</span>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        border: `1px solid ${configured ? C.green + "44" : C.amber + "44"}`,
        background: configured ? C.green + "11" : C.amber + "11",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: configured ? C.green : C.amber,
          boxShadow: `0 0 5px ${configured ? C.green : C.amber}`,
        }}
      />
      <span
        style={{
          color: configured ? C.green : C.amber,
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {configured ? "Connected" : "Not configured"}
      </span>
    </div>
  );
}
