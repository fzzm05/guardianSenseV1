# GuardianSense V1

This folder is the new TypeScript-based rebuild of the original GuardianSense prototype.

The old app remains in the sibling `frontend` and `backend` folders for reference while this workspace becomes the new source of truth.

## Planned Stack

- `apps/web`: Next.js parent dashboard and backend-facing API layer
- `apps/child`: Expo app for the child device
- `packages/types`: shared TypeScript and Zod schemas
- `packages/config`: shared lint and TypeScript config
- `infra`: Docker and local infrastructure files
- `docs`: architecture and migration notes

## Principles

- Start as a modular monolith
- Build everything in TypeScript
- Keep the migration incremental and documented
- Prefer one good implementation over many half-integrated technologies

## Next Steps

1. Scaffold the Next.js app in `apps/web`
2. Scaffold the Expo app in `apps/child`
3. Define the initial data model and shared schemas
4. Add auth, pairing, children, location, and alerts as the first vertical slices
