# What DB Tooling Means

Database tooling is the set of libraries and commands we use to work with the database in a disciplined way.

For this project, that includes:

- schema definition
- migrations
- typed queries
- local and production connection setup

## Chosen Stack

### Drizzle ORM

We use Drizzle to define tables in TypeScript and query Postgres with strong typing.

Why it fits this project:

- close to SQL instead of hiding the database
- good TypeScript support
- works well with server-side Next.js code
- lightweight compared with heavier ORMs

### Drizzle Kit

We use Drizzle Kit for migration generation and schema push workflows.

Key commands:

- `npm run db:generate`
- `npm run db:push`

### pg

We use the `pg` driver underneath for the actual Postgres connection.

## Why This Matters

Good DB tooling helps us:

- keep schema changes versioned
- avoid hand-written mismatch between app code and database
- catch mistakes earlier through types
- make local development and deployment more repeatable
