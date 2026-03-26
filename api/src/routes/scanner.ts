import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";
import { eq, desc, gte } from "drizzle-orm";

export const scannerRouter = new Hono();

const VALID_TYPES = ["penny", "oversold", "short", "options"] as const;
type ScannerType = (typeof VALID_TYPES)[number];

// GET /v1/scanner/:type — latest active scanner results for a given type
scannerRouter.get("/:type", async (c) => {
  const type = c.req.param("type") as ScannerType;

  if (!VALID_TYPES.includes(type)) {
    return c.json(
      { error: `Invalid scanner type. Valid types: ${VALID_TYPES.join(", ")}` },
      400
    );
  }

  const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);

  // Return results from the last 48 hours to show "latest active" results
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(scannerResults)
    .where(eq(scannerResults.scannerType, type))
    .orderBy(desc(scannerResults.scannedAt), desc(scannerResults.score))
    .limit(limit);

  return c.json(rows);
});
