import cron from "node-cron";
import { fetchYahooIndicators } from "./collectors/yahoo.js";
import { fetchFredIndicators } from "./collectors/fred.js";
import { fetchFearGreedIndex } from "./collectors/cnn.js";
import { fetchECBIndicators } from "./collectors/ecb.js";
import { fetchSectorETFs } from "./collectors/sector-etfs.js";
import { fetchVIXTermStructure } from "./collectors/vix-term-structure.js";
import { fetchMarketBreadth } from "./collectors/market-breadth.js";
import { scrapeOpenInsider } from "./collectors/open-insider.js";
import { fetchNewsItems } from "./collectors/news.js";
import { calculateMarketScores } from "./scoring/calculator.js";
import { detectMarketRegimes } from "./scoring/regime-detector.js";
import { runStrategyEngine } from "./engines/strategy-engine.js";
import { generateSignals } from "./engines/signal-generator.js";
import { evaluateSignalOutcomes } from "./engines/signal-evaluator.js";
import { runAllScanners } from "./scanners/index.js";
import { generateDailyBriefings } from "./briefing/briefing-generator.js";

async function runScoringAndIntelligence(): Promise<void> {
  await calculateMarketScores();
  await detectMarketRegimes();
  await runStrategyEngine();
  await generateSignals();
}

export const scheduler = {
  start() {
    // Hourly: fetch fast-moving indicators + news
    cron.schedule("0 * * * *", async () => {
      console.log("[scheduler] Running hourly data collection");
      await Promise.allSettled([
        fetchYahooIndicators(),
        fetchFearGreedIndex(),
        fetchSectorETFs(),
        fetchVIXTermStructure(),
        fetchNewsItems(),
      ]);
      await runScoringAndIntelligence();
    });

    // Daily at 6am UTC: fetch daily/slower indicators + scanners
    cron.schedule("0 6 * * *", async () => {
      console.log("[scheduler] Running daily data collection");
      await Promise.allSettled([
        fetchFredIndicators(),
        fetchECBIndicators(),
        fetchMarketBreadth(),
        scrapeOpenInsider(),
      ]);
      await runScoringAndIntelligence();
      await runAllScanners();
    });

    // Daily at 7am UTC: generate daily briefings after data collection + scoring
    cron.schedule("0 7 * * *", async () => {
      console.log("[scheduler] Generating daily briefings");
      await generateDailyBriefings();
    });

    // Daily at 8am UTC: evaluate signal outcomes from yesterday
    cron.schedule("0 8 * * *", async () => {
      console.log("[scheduler] Evaluating signal outcomes");
      await evaluateSignalOutcomes();
    });

    console.log("[scheduler] Cron jobs registered");
  },
};
