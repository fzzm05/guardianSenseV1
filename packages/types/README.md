# @guardiansense/types

The "Single Source of Truth" for the GuardianSense ecosystem. This package contains the shared domain logic, Zod validation schemas, and TypeScript interfaces used across the Web dashboard and the Mobile client.

## Why This Package Exists

In a full-stack monorepo, the biggest risk is **schema drift** — where the backend expects one thing, but the mobile app sends another. We solve this by:
1. **Defining schemas once** in this package.
2. **Exporting both Zod schemas and TypeScript types**.
3. **Using schemas for runtime validation** on the API and compile-time safety and IDE support across the entire project.

## Key Technologies
- **Zod**: For robust runtime schema validation.
- **TypeScript**: For end-to-end type safety.

## Logical Sections

### 1. Identity & Profiles
Definitions for the core entities: Users, Parents, and Children.
- `userIdentitySchema`
- `parentProfileSchema`
- `childProfileSchema`

### 2. Location & Telemetry
Schemas for the high-frequency data pipeline.
- `locationPointSchema`: Latitude, longitude, accuracy, speed.
- `deviceTelemetrySchema`: Battery levels, charging state, network type.
- `locationEventSchema`: The combined packet sent by child devices.

### 3. Safety & Zones
Validation for the geofencing engine.
- `geofenceSchema`: Center coordinates, radius, and severity levels (Safe/Caution/Danger).

### 4. API Input Handlers
Specialized schemas for validating PATCH/POST requests.
- `updateParentProfileInputSchema`
- `updateParentSettingsInputSchema`
- `updateChildInputSchema`

## Usage Example

```typescript
import { updateParentSettingsInputSchema, UpdateParentSettingsInput } from "@guardiansense/types";

// Used in a Next.js API route
const body = await req.json();
const validated = updateParentSettingsInputSchema.parse(body); // Throws if invalid
```
