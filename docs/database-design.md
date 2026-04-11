# GuardianSense Database Design

This document translates the shared domain schemas into an initial Postgres design for Supabase.

## Principles

- Postgres is the source of truth
- Child telemetry is append-only
- Dashboard reads should not require scanning raw telemetry tables
- Every user-facing row should carry ownership boundaries clearly
- Firebase handles authentication, Postgres stores application identity and relationships

## Core Tables

### `users`

Application-level identity mapped to Firebase Auth.

Suggested columns:

- `id uuid primary key`
- `firebase_uid text unique not null`
- `role text not null`
- `email text not null`
- `display_name text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- unique index on `firebase_uid`
- index on `email`

### `parents`

Parent-specific profile data.

Suggested columns:

- `id uuid primary key`
- `user_id uuid unique not null references users(id)`
- `phone_number text null`
- `timezone text not null default 'UTC'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `children`

Child identity and current read-model snapshot.

Suggested columns:

- `id uuid primary key`
- `parent_id uuid not null references parents(id)`
- `display_name text not null`
- `status text not null default 'unknown'`
- `date_of_birth date null`
- `current_zone_label text null`
- `last_latitude double precision null`
- `last_longitude double precision null`
- `last_accuracy_meters double precision null`
- `last_recorded_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- index on `parent_id`
- index on `(parent_id, display_name)`
- index on `last_recorded_at`

### `child_devices`

Tracks devices paired to a child account or child record.

Suggested columns:

- `id uuid primary key`
- `child_id uuid not null references children(id)`
- `platform text not null`
- `device_name text null`
- `app_version text null`
- `last_seen_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- index on `child_id`
- index on `last_seen_at`

### `location_events`

Immutable telemetry table.

Suggested columns:

- `id uuid primary key`
- `child_id uuid not null references children(id)`
- `device_id uuid null references child_devices(id)`
- `latitude double precision not null`
- `longitude double precision not null`
- `accuracy_meters double precision null`
- `altitude_meters double precision null`
- `speed_meters_per_second double precision null`
- `heading_degrees double precision null`
- `battery_level double precision null`
- `is_charging boolean null`
- `network_type text null`
- `os_version text null`
- `app_version text null`
- `source text not null default 'gps'`
- `recorded_at timestamptz not null`
- `created_at timestamptz not null default now()`

Indexes:

- index on `(child_id, recorded_at desc)`
- index on `device_id`
- optional BRIN index on `recorded_at` when table grows large

### `alerts`

Alerts raised for parents about a child.

Suggested columns:

- `id uuid primary key`
- `child_id uuid not null references children(id)`
- `type text not null`
- `priority text not null`
- `title text not null`
- `message text not null`
- `actions_json jsonb not null default '[]'::jsonb`
- `acknowledged_at timestamptz null`
- `created_at timestamptz not null default now()`

Indexes:

- index on `(child_id, created_at desc)`
- index on `acknowledged_at`

### `geofences`

Parent-defined safety zones.

Suggested columns:

- `id uuid primary key`
- `parent_id uuid not null references parents(id)`
- `label text not null`
- `center_latitude double precision not null`
- `center_longitude double precision not null`
- `radius_meters double precision not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- index on `parent_id`
- partial index on active rows if needed

### `parent_settings`

Per-parent operational preferences.

Suggested columns:

- `parent_id uuid primary key references parents(id)`
- `risk_sensitivity smallint not null default 2`
- `alert_frequency_seconds integer not null default 60`
- `push_alerts_enabled boolean not null default true`
- `email_alerts_enabled boolean not null default false`
- `updated_at timestamptz not null default now()`

## Query Shapes To Optimize For

### Parent dashboard

Needs:

- all children for one parent
- child current status
- last known location
- recent alerts

Optimization approach:

- read mostly from `children`
- join to latest alerts separately
- do not scan `location_events` on every dashboard load

### Child detail page

Needs:

- current child snapshot
- recent location history
- recent alerts

Optimization approach:

- `children` for current snapshot
- `location_events` filtered by `child_id` and time window
- index on `(child_id, recorded_at desc)`

### Device enrollment

Needs:

- find a pending, non-expired code fast
- mark it verified atomically

Optimization approach:

- unique `code`
- transaction around verification plus child/device creation

## Recommended Row-Level Security Direction

If using Supabase access patterns later:

- parents can read only their own parent row
- parents can read only their own children
- parents can read only alerts for their children
- service role writes telemetry and alert generation outputs

## Migration Sequence

1. `users`
2. `parents`
3. `children`
4. `child_devices`
5. `pairing_codes`
6. `parent_settings`
7. `location_events`
8. `alerts`
9. `geofences`

## Future Additions

- notification deliveries table
- audit logs table
- geofence event history table
- materialized child summary view
- partitioning strategy for `location_events`
