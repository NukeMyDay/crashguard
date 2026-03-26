import { useState, useEffect } from "react";
import { C } from "../context.js";
import { fetchJSON } from "../api.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  anthropicApiKey: {
    configured: boolean;
    maskedValue: string | null;
    updatedAt: string | null;
  };
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

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
