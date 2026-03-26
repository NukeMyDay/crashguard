/**
 * Settings API — GET/POST /v1/settings
 *
 * Stores application settings (e.g. Anthropic API key) encrypted at rest
 * using AES-256-GCM. The ENCRYPTION_SECRET env var is used to derive the
 * 32-byte key. The full plaintext is never returned — only a masked preview.
 */
import { Hono } from "hono";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { db } from "@marketpulse/db/client";
import { appSettings } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = new Hono();

// ─── Encryption helpers ───────────────────────────────────────────────────────

function getDerivedKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET ?? "marketpulse-default-secret-change-me";
  // Derive a 32-byte key via SHA-256 of the secret
  return createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Pack as base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decrypt(encoded: string): string {
  const key = getDerivedKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function maskKey(value: string): string {
  if (value.length <= 8) return "****";
  // Show first 10 chars + ****
  return value.slice(0, 10) + "****";
}

// ─── GET /v1/settings ─────────────────────────────────────────────────────────

settingsRouter.get("/", async (c) => {
  const rows = await db.select().from(appSettings);
  const settings: Record<string, { maskedValue: string; updatedAt: string }> = {};

  for (const row of rows) {
    try {
      const plaintext = decrypt(row.encryptedValue);
      settings[row.key] = {
        maskedValue: maskKey(plaintext),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      settings[row.key] = { maskedValue: "****", updatedAt: row.updatedAt.toISOString() };
    }
  }

  const anthropicRow = settings["anthropic_api_key"];
  return c.json({
    anthropicApiKey: anthropicRow
      ? { configured: true, maskedValue: anthropicRow.maskedValue, updatedAt: anthropicRow.updatedAt }
      : { configured: false, maskedValue: null, updatedAt: null },
  });
});

// ─── POST /v1/settings ────────────────────────────────────────────────────────

settingsRouter.post("/", async (c) => {
  const body = await c.req.json<{ anthropicApiKey?: string }>();

  if (!body.anthropicApiKey?.trim()) {
    return c.json({ error: "anthropicApiKey is required" }, 400);
  }

  const apiKey = body.anthropicApiKey.trim();
  const encrypted = encrypt(apiKey);

  await db
    .insert(appSettings)
    .values({ key: "anthropic_api_key", encryptedValue: encrypted, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { encryptedValue: encrypted, updatedAt: new Date() },
    });

  return c.json({
    success: true,
    maskedValue: maskKey(apiKey),
  });
});

// ─── POST /v1/settings/test ───────────────────────────────────────────────────

settingsRouter.post("/test", async (c) => {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "anthropic_api_key"))
    .limit(1);

  if (!row[0]) {
    return c.json({ success: false, error: "No API key configured" }, 400);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(row[0].encryptedValue);
  } catch {
    return c.json({ success: false, error: "Failed to decrypt stored key" }, 500);
  }

  // Make a minimal API call to verify the key works
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (res.ok) {
      return c.json({ success: true });
    }
    const errBody = await res.json().catch(() => ({}));
    return c.json({ success: false, error: (errBody as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` }, 400);
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Export decrypt helper for use in other routes ───────────────────────────

export { decrypt as decryptSetting };
