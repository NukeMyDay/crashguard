import { db } from "./client.js";
import { strategies } from "./schema/index.js";

const INITIAL_STRATEGIES = [
  {
    slug: "momentum",
    name: "Momentum",
    type: "momentum" as const,
    description:
      "Follows price trends by buying assets with strong recent performance and selling those with weak performance. Capitalizes on continuation of existing trends.",
    isActive: true,
    config: {
      lookbackDays: 90,
      rebalanceDays: 30,
      minStrength: 60,
      universe: "sp500",
    },
  },
  {
    slug: "mean-reversion",
    name: "Mean Reversion",
    type: "mean_reversion" as const,
    description:
      "Bets on prices reverting to their historical averages after extreme moves. Buys oversold assets and sells overbought ones.",
    isActive: true,
    config: {
      zScoreThreshold: 2.0,
      lookbackDays: 20,
      holdDays: 5,
      universe: "sp500",
    },
  },
  {
    slug: "sector-rotation",
    name: "Sector Rotation",
    type: "sector_rotation" as const,
    description:
      "Rotates capital into sectors that are expected to outperform in the current economic cycle phase. Uses macro indicators to determine cycle position.",
    isActive: true,
    config: {
      rebalanceDays: 30,
      topSectors: 3,
      minRelativeStrength: 1.0,
      universe: "sector_etfs",
    },
  },
  {
    slug: "risk-off",
    name: "Risk Off",
    type: "risk_off" as const,
    description:
      "Defensive strategy that rotates into safe-haven assets (bonds, gold, utilities, cash) when crash probability is elevated. Triggered by high VIX or crash score.",
    isActive: true,
    config: {
      crashScoreThreshold: 60,
      vixThreshold: 25,
      safeHavenAssets: ["TLT", "GLD", "VNQ", "XLU"],
      cashPercent: 50,
    },
  },
  {
    slug: "short",
    name: "Short Selling",
    type: "short" as const,
    description:
      "Identifies technically weak or fundamentally deteriorating stocks to sell short. Focuses on broken setups, earnings misses, and downtrend confirmation.",
    isActive: true,
    config: {
      minDowntrendDays: 30,
      maxMarketCap: 10e9,
      minVolume: 500000,
      crashScoreMin: 50,
    },
  },
  {
    slug: "penny",
    name: "Penny Stock Scanner",
    type: "penny" as const,
    description:
      "Scans for high-momentum penny stocks with unusual volume surges and catalyst events. High risk/reward with strict position sizing.",
    isActive: true,
    config: {
      maxPrice: 5.0,
      minVolumeMultiple: 3,
      minPrice: 0.1,
      minMarketCap: 10e6,
      maxMarketCap: 300e6,
    },
  },
];

async function seedStrategies() {
  console.log("Seeding strategies...");

  for (const strategy of INITIAL_STRATEGIES) {
    await db
      .insert(strategies)
      .values({
        slug: strategy.slug,
        name: strategy.name,
        type: strategy.type,
        description: strategy.description,
        isActive: strategy.isActive,
        config: strategy.config,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${INITIAL_STRATEGIES.length} strategies.`);
  process.exit(0);
}

seedStrategies().catch((err) => {
  console.error(err);
  process.exit(1);
});
