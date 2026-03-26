import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { alerts, alertWebhooks } from "@marketpulse/db/schema";
import { desc, eq } from "drizzle-orm";

export const alertsRouter = new Hono();

// GET /v1/alerts
alertsRouter.get("/", async (c) => {
  const rows = await db.select().from(alerts).orderBy(desc(alerts.triggeredAt)).limit(50);
  return c.json(rows);
});

// POST /v1/alerts/webhook — register a webhook URL
alertsRouter.post("/webhook", async (c) => {
  const body = await c.req.json() as { url: string; minSeverity?: "warning" | "critical" | "extreme" };
  if (!body.url) {
    return c.json({ error: "url is required" }, 400);
  }

  const validSeverities = ["warning", "critical", "extreme"];
  const minSeverity = body.minSeverity ?? "warning";
  if (!validSeverities.includes(minSeverity)) {
    return c.json({ error: `minSeverity must be one of: ${validSeverities.join(", ")}` }, 400);
  }

  const [created] = await db
    .insert(alertWebhooks)
    .values({ url: body.url, minSeverity, isActive: true })
    .returning();

  return c.json(created, 201);
});

// GET /v1/alerts/webhook — list registered webhooks
alertsRouter.get("/webhook", async (c) => {
  const rows = await db.select().from(alertWebhooks).orderBy(desc(alertWebhooks.createdAt));
  return c.json(rows);
});

// DELETE /v1/alerts/webhook/:id — remove a webhook
alertsRouter.delete("/webhook/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await db
    .delete(alertWebhooks)
    .where(eq(alertWebhooks.id, id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }
  return c.json({ message: "Webhook deleted" });
});
