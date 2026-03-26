import { Hono } from "hono";
import { createHash, randomBytes } from "crypto";
import { db } from "@marketpulse/db/client";
import { apiKeys, marketScores } from "@marketpulse/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const publicRouter = new Hono();
export const apiKeysRouter = new Hono();

// ─── Rate limiting (in-memory) ────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 60; // requests per hour
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(keyId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Score level helper ───────────────────────────────────────────────────────

function scoreLevel(score: number): string {
  if (score >= 90) return "Extreme";
  if (score >= 75) return "Critical";
  if (score >= 60) return "Warning";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Low";
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function resolveApiKey(
  authHeader: string | undefined
): Promise<{ id: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  const hash = createHash("sha256").update(raw).digest("hex");

  const [found] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  return found ?? null;
}

// ─── Public endpoint: GET /v1/public/crash-score ─────────────────────────────

publicRouter.get("/crash-score", async (c) => {
  const key = await resolveApiKey(c.req.header("Authorization"));
  if (!key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!checkRateLimit(key.id)) {
    return c.json({ error: "Rate limit exceeded (60 req/hour)" }, 429);
  }

  // Update usage stats (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date(), requestCount: sql`${apiKeys.requestCount} + 1` })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});

  const MARKETS = ["global", "us", "eu", "asia"] as const;

  const scores = await Promise.all(
    MARKETS.map(async (market) => {
      const [row] = await db
        .select()
        .from(marketScores)
        .where(eq(marketScores.market, market))
        .orderBy(desc(marketScores.calculatedAt))
        .limit(1);
      return { market, row };
    })
  );

  const result: Record<string, unknown> = {};
  for (const { market, row } of scores) {
    if (row) {
      result[market] = {
        score: Number(row.crashScore),
        level: scoreLevel(Number(row.crashScore)),
        calculatedAt: row.calculatedAt,
      };
    } else {
      result[market] = { score: null, level: null, calculatedAt: null };
    }
  }

  return c.json(result);
});

// ─── API Key management ───────────────────────────────────────────────────────

// POST /v1/api-keys
apiKeysRouter.post("/", async (c) => {
  let label: string | null = null;
  try {
    const body = await c.req.json<{ label?: string }>();
    label = body.label ?? null;
  } catch {
    // no body provided
  }

  const rawKey = "mp_live_" + randomBytes(24).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const [created] = await db
    .insert(apiKeys)
    .values({ keyHash, label })
    .returning({ id: apiKeys.id, label: apiKeys.label, createdAt: apiKeys.createdAt });

  return c.json({ key: rawKey, id: created.id, label: created.label }, 201);
});

// GET /v1/api-keys
apiKeysRouter.get("/", async (c) => {
  const keys = await db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      requestCount: apiKeys.requestCount,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));

  return c.json(keys);
});

// DELETE /v1/api-keys/:id
apiKeysRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const deleted = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id });

  if (deleted.length === 0) {
    return c.json({ error: "API key not found" }, 404);
  }

  return c.json({ revoked: deleted[0].id });
});
