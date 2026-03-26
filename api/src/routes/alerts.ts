import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { alerts } from "@marketpulse/db/schema";
import { desc, isNull } from "drizzle-orm";

export const alertsRouter = new Hono();

// GET /v1/alerts
alertsRouter.get("/", async (c) => {
  const unacknowledgedOnly = c.req.query("unacknowledged") === "true";

  let query = db.select().from(alerts).orderBy(desc(alerts.triggeredAt)).limit(50);

  const rows = await query;
  return c.json(rows);
});
