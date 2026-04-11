# GuardianSense

A real-time child safety monitoring platform built for parents who want meaningful awareness — not just a tracker. GuardianSense combines location intelligence, device telemetry, and configurable safe zones to give parents a live, contextual picture of their child's day.

---

## What It Does

- **Real-time location tracking** — The parent dashboard updates live as the child's device reports its position, without requiring a manual refresh.
- **Safe zones & danger detection** — Parents define geographic boundaries. The system automatically classifies each location event as safe, cautious, or dangerous based on proximity to those zones.
- **Device telemetry** — Battery level, charging state, network type, and movement speed are streamed alongside location data so parents always know if a device is healthy.
- **Instant alerts** — When something significant happens (zone violations, heartbeat loss, unusual movement), parents receive an immediate notification via Telegram.
- **Secure device pairing** — Child devices are authenticated with a short-lived pairing code that generates a persistent token, so only trusted hardware can submit data.
- **Timeline of events** — Every meaningful transition (entered zone, left zone, charging connected, heartbeat lost) is recorded as a browseable timeline on the parent dashboard.

---

## Architecture

This is a TypeScript monorepo structured as a modular monolith.

| Workspace | Purpose |
|---|---|
| `apps/web` | Next.js parent dashboard and API backend |
| `apps/child` | Expo app installed on the child's device |
| `packages/db` | Drizzle ORM schema and database client |
| `packages/types` | Shared Zod schemas and TypeScript types |
| `infra` | Infrastructure configuration |

**Core infrastructure:**
- **Database** — PostgreSQL via Supabase (schema managed by Drizzle ORM)
- **Realtime** — Supabase Postgres replication for live dashboard updates
- **Auth** — Firebase Authentication for parent accounts; token-based auth for child devices
- **Alerts** — Telegram Bot API for push notifications
- **Rate limiting** — Redis (Upstash) for pairing code flow protection

---

## Current Status

The platform is feature-complete for its first vertical slice and production-ready for deployment.

**Completed:**
- Authentication and session management
- Child device pairing and secure token issuance
- Location event ingestion, zone matching, and snapshot updates
- Device telemetry processing (battery, charging, network, speed)
- Timeline event generation for zone transitions and device state changes
- Parent dashboard with live Supabase realtime subscriptions
- Telegram alert integration with deep-link account linking
- Safe zone management

**Stabilised:**
- Route protection and API authentication
- Ghost device prevention during OS updates
- Dashboard sorting to correctly prioritise active devices
- Parent settings initialisation on account creation
- Database SSL for remote connections

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in your database, Firebase, Supabase, Upstash, and Telegram credentials

# Start all workspaces
npm run dev
```

The parent dashboard runs at `http://localhost:3000`.

---

## Next Steps

- Deploy to a public hosting environment to enable live webhook integrations
- Implement background job processing for deferred alert logic
- Surface the latest telemetry snapshot via a dedicated API for external consumers
- Expand alert channels and introduce per-child alert preferences
- Harden infrastructure for production traffic (connection pooling, error monitoring)
