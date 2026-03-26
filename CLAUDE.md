# MarketPulse — Project Spec

Real-time market health monitoring and crash probability dashboard. Tracks global and per-market financial indicators to calculate a composite Crash Probability Score (0–100).

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript (ESM) |
| API | Hono + @hono/node-server |
| Database | PostgreSQL 16 + Drizzle ORM |
| Job Scheduler | pg-boss / node-cron |
| Frontend | React 18 + Vite + Recharts |
| Infrastructure | Docker Compose |
| Package Manager | pnpm (workspaces) |

## Monorepo Structure

```
/paperclip/marketpulse/
├── api/          — Hono API server (port 3000)
├── dashboard/    — React frontend (Vite, port 5173 dev / 8080 prod)
├── pipelines/    — Data collection workers + scoring engine
├── db/           — Drizzle schemas + migrations
├── shared/       — Shared types + constants
└── infra/        — Docker Compose + Dockerfiles + nginx.conf
```

## Database Schema

### indicators
- id (uuid PK), slug (unique), name, category (market|sentiment|macro|volatility|credit)
- source (fred|yahoo|alpha_vantage|cnn|ecb), frequency (hourly|daily|weekly|monthly)
- weight (decimal), warningThreshold, criticalThreshold, isActive, createdAt, updatedAt

### indicator_values
- id (uuid PK), indicatorId (FK → indicators), value (numeric), normalizedValue (0–100)
- recordedAt (timestamp), createdAt

### market_scores
- id (uuid PK), market (global|us|eu|asia), crashScore (0–100)
- componentScores (JSON: {volatility, sentiment, macro, credit}), calculatedAt, createdAt

### alerts
- id (uuid PK), market, severity (warning|critical|extreme)
- message (text), crashScore, triggeredAt, acknowledgedAt

## Key Indicators

| Slug | Name | Source | FRED Series |
|---|---|---|---|
| vix | VIX Volatility Index | yahoo | — |
| yield-curve-2y10y | Yield Curve 2Y-10Y Spread | fred | T10Y2Y |
| credit-spreads-hy | HY Credit Spreads | fred | BAMLH0A0HYM2 |
| put-call-ratio | Put/Call Ratio | yahoo | — |
| spx-breadth-200ma | S&P 500 Breadth | yahoo | — |
| dxy | DXY Dollar Index | yahoo | — |
| pmi-manufacturing | PMI Manufacturing | fred | MPMICTOT |
| consumer-confidence | Consumer Confidence | fred | UMCSENT |
| m2-money-supply | M2 Money Supply | fred | M2SL |
| fear-greed-index | Fear & Greed Index | cnn | — |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| GET | /v1/dashboard | Current crash scores + alerts |
| GET | /v1/indicators | All active indicators |
| GET | /v1/indicators/:slug/history | Historical values (?days=30) |
| GET | /v1/alerts | Recent alerts |
| GET | /v1/score/history | Historical crash scores (?market=global&days=30) |

## Environment Variables

```env
DATABASE_URL=postgres://marketpulse:marketpulse@localhost:5432/marketpulse
PORT=3000               # API server port
FRED_API_KEY=           # Required for FRED data collection
```

## Development

```bash
# Start infrastructure
pnpm docker:up

# Install deps
pnpm install

# Run migrations + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Optional: seed historical backtest data (2008, 2020, 2022 crash periods)
pnpm db:backtest

# Start dev servers
pnpm dev          # starts both API and dashboard
```

## Crash Score Thresholds

| Score | Level |
|---|---|
| 0–24 | Low |
| 25–49 | Moderate |
| 50–59 | High |
| 60–74 | Warning |
| 75–89 | Critical |
| 90–100 | Extreme |

## Architecture Notes

- Pipelines run on a cron schedule: hourly for Yahoo/CNN, daily at 6am UTC for FRED + ECB
- Normalized values (0–100) represent crash risk contribution (higher = more risky)
- Composite score is a weighted average of normalized indicator values
- Alerts are auto-generated when crash score ≥ 75 (critical) or ≥ 90 (extreme)
- Market scores are calculated after each data collection cycle
