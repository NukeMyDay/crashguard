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
import { fetchRedditWSB } from "./collectors/reddit-wsb.js";
import { fetchEdgarFilings } from "./collectors/edgar.js";
import { calculateMarketScores } from "./scoring/calculator.js";
import { detectMarketRegimes } from "./scoring/regime-detector.js";
import { runStrategyEngine } from "./engines/strategy-engine.js";
import { generateSignals } from "./engines/signal-generator.js";
import { evaluateSignalOutcomes } from "./engines/signal-evaluator.js";
import { runAllScanners } from "./scanners/index.js";
import { generateDailyBriefings } from "./briefing/briefing-generator.js";
import { fetchOptionsFlow } from "./collectors/options-flow.js";
import { fetchEarningsCalendar } from "./collectors/earnings-calendar.js";
import { collectMacroEvents } from "./collectors/macro-events.js";
import { collectGeopoliticalRisk } from "./collectors/geopolitical.js";
import { runConfidenceCalibration } from "./engines/confidence-calibrator.js";
import { fetchDarkPoolPrints } from "./collectors/dark-pool.js";

async function runScoringAndIntelligence(): Promise<void> {
  await calculateMarketScores();
  await detectMarketRegimes();
  await runStrategyEngine();
  await generateSignals();
}

export const scheduler = {
  start() {
    // Hourly: fetch fast-moving indicators + news + Reddit WSB + geopolitical risk
    cron.schedule("0 * * * *", async () => {
      console.log("[scheduler] Running hourly data collection");
      await Promise.allSettled([
        fetchYahooIndicators(),
        fetchFearGreedIndex(),
        fetchSectorETFs(),
        fetchVIXTermStructure(),
        fetchNewsItems(),
        fetchRedditWSB(),
        collectGeopoliticalRisk(),
      ]);
      await runScoringAndIntelligence();
    });

    // Every 2 hours: SEC EDGAR filings
    cron.schedule("0 */2 * * *", async () => {
      console.log("[scheduler] Running SEC EDGAR collection");
      await fetchEdgarFilings();
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

    // Every 30 minutes during market hours (14:00–21:00 UTC = ~9:30am–4pm ET, Mon–Fri)
    cron.schedule("*/30 14-21 * * 1-5", async () => {
      console.log("[scheduler] Running options flow scan");
      await fetchOptionsFlow();
    });

    // Daily at 7am UTC: generate daily briefings + fetch earnings calendar + macro events
    cron.schedule("0 7 * * *", async () => {
      console.log("[scheduler] Generating daily briefings + earnings calendar + macro events");
      await Promise.allSettled([generateDailyBriefings(), fetchEarningsCalendar(), collectMacroEvents()]);
    });

    // Daily at 8am UTC: evaluate signal outcomes + fetch dark pool prints from yesterday
    cron.schedule("0 8 * * *", async () => {
      console.log("[scheduler] Evaluating signal outcomes + fetching dark pool data");
      await Promise.allSettled([evaluateSignalOutcomes(), fetchDarkPoolPrints()]);
    });

    // Nightly at 11pm UTC: run confidence calibration
    cron.schedule("0 23 * * *", async () => {
      console.log("[scheduler] Running confidence calibration");
      await runConfidenceCalibration();
    });

    console.log("[scheduler] Cron jobs registered");
  },
};
