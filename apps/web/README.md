# GuardianSense — Web

The parent-facing dashboard and API backend, built with Next.js. This is the core of the GuardianSense platform — it handles everything from location data ingestion to the real-time map view parents use to monitor their children.

## What Lives Here

- **Parent dashboard** — Live map, device status, safe zone overlays, and event timeline
- **API routes** — Location event ingestion, pairing code flow, device telemetry, safe zone management
- **Auth** — Session management backed by Firebase
- **Realtime** — Live dashboard updates via Supabase Postgres replication
- **Alert delivery** — Telegram bot integration for instant push notifications

## Getting Started

```bash
# From the monorepo root
npm install

# Copy and fill in environment variables
cp .env.example .env.local

# Start the dev server
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `FIREBASE_*` | Firebase Admin SDK credentials |
| `UPSTASH_REDIS_REST_URL` | Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token for alerts |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps for the dashboard map |

## Deployment

This app is designed to deploy as a standard Next.js application. The recommended path is Vercel — set the root directory to `apps/web` and provide the environment variables listed above.

After deploying, register your Telegram webhook once:
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://your-domain.com/api/telegram/webhook"
```
