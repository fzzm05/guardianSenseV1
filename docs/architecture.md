# GuardianSense Rebuild Architecture

## Goals

- Replace the legacy React + Express prototype with a TypeScript-first platform
- Support a real Expo child app instead of a browser-only tracker
- Build a clean backend with room for REST, GraphQL, realtime, caching, and jobs
- Keep the first implementation small enough to ship

## Recommended Initial Architecture

### Runtime shape

- Modular monolith
- One Next.js codebase for web UI and backend API routes
- One Expo mobile app for the child device
- Shared types and validation in a workspace package

### Platform choices

- Frontend web: Next.js
- Child mobile app: Expo
- Authentication: Firebase Auth
- Database: Supabase Postgres
- Realtime: Supabase Realtime
- Cache and short-lived data: Redis
- Deployment: Vercel for web, EAS for mobile builds
- Containers: Docker for local development

## Initial Domains

- Auth
- Parents
- Children
- Pairing sessions
- Device sessions
- Location events
- Alerts
- Parent settings

## Proposed API Style

Start with REST:

- `POST /api/pairing-codes`
- `POST /api/pairing-codes/verify`
- `GET /api/children`
- `GET /api/children/:id`
- `POST /api/children/:id/location-events`
- `GET /api/children/:id/alerts`
- `PATCH /api/parent-settings`

Add GraphQL later when read patterns stabilize.

## Data Model Direction

### Core tables

- `users`
- `parents`
- `children`
- `child_devices`
- `location_events`
- `alerts`
- `parent_settings`

### Design notes

- Keep telemetry append-only in `location_events`
- Store `firebase_uid` on internal user records
- Denormalize current child state for fast dashboards
- Add indexes around parent ownership and recent location lookups

## Migration Strategy

1. Rebuild auth and user identity
2. Rebuild pairing flow
3. Rebuild child list and dashboard read model
4. Rebuild location ingestion
5. Rebuild alerts and realtime feed
6. Retire legacy code once parity is reached

## Deliberate Non-Goals For V1

- Microservices
- Kafka or RabbitMQ
- Multiple backend frameworks
- Premature GraphQL-first design
- Overly complex AWS infrastructure
