# @guardiansense/db

The centralized data access layer for GuardianSense. This package manages our PostgreSQL schema via **Drizzle ORM** and provides a type-safe client used by the Next.js API.

## 🚀 Why Drizzle?

We chose Drizzle ORM over other alternatives for three core reasons:
1. **Performance**: Minimal overhead compared to "heavy" ORMs; it's practically raw SQL with TypeScript superpowers.
2. **Type-Safer Migrations**: Migrations are generated as plain SQL files, making them easy to audit and deploy via standard CI/CD pipelines.
3. **Relation Handling**: Our complex relationship between Parents, Children, and high-frequency Location Events requires precise join control, which Drizzle provides natively.

## 🛠️ Key Technologies
- **Drizzle ORM**: For type-safe query building and migrations.
- **Supabase (PostgreSQL)**: Our primary data store.
- **Zod-Drizzle**: For generating Zod schemas directly from database tables.

## 📂 Logical Structure

### 1. Schema Definition (`src/schema.ts`)
The heart of our domain model.
- `parents`: Profile info and global settings.
- `children`: Identity and safety status.
- `locations`: High-frequency event store with zone-matching categories.
- `geofences`: Geographic boundaries defined by parents.

### 2. Client & Utils (`src/index.ts`)
Provides the singleton database client and common query utilities.

## 💻 Migration Workflow

We use a migration-first approach to ensure schema stability.

```bash
# To generate a new migration after changing the schema.ts
npx drizzle-kit generate

# To push changes to the development database
npx drizzle-kit push
```

## 🔐 Relational Integrity
The database implements strict `ON DELETE CASCADE` behaviors for account deletion, ensuring that if a parent deletes their account, all related children, locations, and settings are wiped cleanly for privacy compliance.
