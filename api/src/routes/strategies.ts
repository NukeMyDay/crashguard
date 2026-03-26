import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { strategies } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

export const strategiesRouter = new Hono();

// GET /v1/strategies — all strategies (optionally only active)
strategiesRouter.get("/", async (c) => {
  const activeOnly = c.req.query("active") === "true";

  const rows = activeOnly
    ? await db.select().from(strategies).where(eq(strategies.isActive, true))
    : await db.select().from(strategies);

  return c.json(rows);
});
