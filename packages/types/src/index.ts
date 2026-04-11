import { z } from "zod";

export const isoDatetimeSchema = z.string().datetime();
export const uuidSchema = z.string().uuid();
export const PAIRING_CODE_LENGTH = 8;

export const userRoleSchema = z.enum(["parent", "child", "admin"]);
export const alertPrioritySchema = z.enum(["low", "medium", "high"]);
export const alertTypeSchema = z.enum([
  "location",
  "geofence",
  "safety",
  "system",
  "device"
]);
export const childStatusSchema = z.enum([
  "safe",
  "warning",
  "danger",
  "offline",
  "unknown"
]);
export const geofenceSeveritySchema = z.enum(["safe", "caution", "danger"]);
export const childEventTypeSchema = z.enum([
  "zone_entered",
  "zone_exited",
  "zone_changed",
  "charging_started",
  "charging_stopped",
]);

export const authProviderSchema = z.enum([
  "firebase-password",
  "firebase-google",
  "firebase-apple"
]);

export const userIdentitySchema = z.object({
  id: uuidSchema,
  firebaseUid: z.string().min(1),
  role: userRoleSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export const parentProfileSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  phoneNumber: z.string().min(6).nullable(),
  timezone: z.string().min(1),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export const childProfileSchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema,
  displayName: z.string().min(1),
  status: childStatusSchema,
  dateOfBirth: z.string().date().nullable(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export const childDeviceSchema = z.object({
  id: uuidSchema,
  childId: uuidSchema,
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().min(1).nullable(),
  deviceBrand: z.string().min(1).nullable().optional(),
  deviceModel: z.string().min(1).nullable().optional(),
  osVersion: z.string().min(1).nullable().optional(),
  appVersion: z.string().min(1).nullable(),
  lastSeenAt: isoDatetimeSchema.nullable(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export const deviceStatusSchema = z.object({
  deviceId: uuidSchema,
  childId: uuidSchema,
  batteryLevel: z.number().min(0).max(1).nullable(),
  isCharging: z.boolean().nullable(),
  networkType: z.string().min(1).nullable(),
  speedMetersPerSecond: z.number().nonnegative().nullable(),
  source: z.enum(["gps", "manual", "simulated", "unknown"]),
  appVersion: z.string().min(1).nullable(),
  osVersion: z.string().min(1).nullable(),
  lastSeenAt: isoDatetimeSchema,
  lastLocationRecordedAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
});

function nullishToNull<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === undefined ? null : value),
    schema.nullable(),
  );
}

export const childDeviceMetadataSchema = z.object({
  appVersion: z.string().min(1).max(120).optional(),
  osVersion: z.string().min(1).max(160).optional(),
  deviceModel: z.string().min(1).max(160).optional(),
  deviceBrand: z.string().min(1).max(160).optional()
});

export const locationPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: nullishToNull(z.number().nonnegative()),
  altitudeMeters: nullishToNull(z.number()),
  speedMetersPerSecond: nullishToNull(z.number().nonnegative()),
  headingDegrees: nullishToNull(z.number().min(0).max(360)),
  recordedAt: isoDatetimeSchema
});

export const deviceTelemetrySchema = z.object({
  batteryLevel: nullishToNull(z.number().min(0).max(1)),
  isCharging: nullishToNull(z.boolean()),
  networkType: nullishToNull(z.string().min(1)),
  osVersion: nullishToNull(z.string().min(1)),
  appVersion: nullishToNull(z.string().min(1))
});

export const locationEventSchema = z.object({
  id: uuidSchema,
  childId: uuidSchema,
  deviceId: uuidSchema.nullable(),
  point: locationPointSchema,
  telemetry: deviceTelemetrySchema.nullable(),
  source: z.enum(["gps", "manual", "simulated", "unknown"]),
  createdAt: isoDatetimeSchema
});

export const childSnapshotSchema = z.object({
  childId: uuidSchema,
  status: childStatusSchema,
  currentZoneLabel: z.string().min(1).nullable(),
  lastKnownLocation: locationPointSchema.nullable(),
  lastUpdatedAt: isoDatetimeSchema.nullable()
});

export const alertActionSchema = z.object({
  label: z.string().min(1),
  actionType: z.enum(["call", "message", "navigate", "dismiss", "custom"]),
  payload: z.record(z.string(), z.string()).default({})
});

export const alertSchema = z.object({
  id: uuidSchema,
  childId: uuidSchema,
  type: alertTypeSchema,
  priority: alertPrioritySchema,
  title: z.string().min(1),
  message: z.string().min(1),
  actions: z.array(alertActionSchema),
  createdAt: isoDatetimeSchema,
  acknowledgedAt: isoDatetimeSchema.nullable()
});

export const childEventSchema = z.object({
  id: uuidSchema,
  childId: uuidSchema,
  type: childEventTypeSchema,
  title: z.string().min(1),
  detail: z.string().min(1).nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDatetimeSchema,
});

export const geofenceSchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema,
  label: z.string().min(1),
  severity: geofenceSeveritySchema,
  centerLatitude: z.number().min(-90).max(90),
  centerLongitude: z.number().min(-180).max(180),
  radiusMeters: z.number().positive(),
  isActive: z.boolean(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export const placeSearchResultSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const parentSettingsSchema = z.object({
  parentId: uuidSchema,
  riskSensitivity: z.number().int().min(1).max(3),
  alertFrequencySeconds: z.number().int().min(15).max(3600),
  pushAlertsEnabled: z.boolean(),
  emailAlertsEnabled: z.boolean(),
  updatedAt: isoDatetimeSchema
});

export const createPairingCodeInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    childName: z.string().min(1).max(80).optional(),
  })
  .refine(
    (value) => {
      const hasChildId = Boolean(value.childId);
      const hasChildName = Boolean(value.childName?.trim());

      return hasChildId !== hasChildName;
    },
    {
      message: "Provide either childId for an existing child or childName for a new child.",
      path: ["childId"],
    },
  );

export const verifyPairingCodeInputSchema = z.object({
  code: z.string().regex(
    new RegExp(`^\\d{${PAIRING_CODE_LENGTH}}$`),
    `Pairing code must be exactly ${PAIRING_CODE_LENGTH} digits.`
  ),
  deviceName: z.string().min(1).max(120),
  deviceMetadata: childDeviceMetadataSchema.optional(),
  platform: z.enum(["ios", "android", "web"])
});

export const createLocationEventInputSchema = z.object({
  childId: uuidSchema,
  deviceId: uuidSchema.optional(),
  point: locationPointSchema,
  telemetry: deviceTelemetrySchema.optional(),
  source: z.enum(["gps", "manual", "simulated", "unknown"]).default("gps")
});

export const createGeofenceInputSchema = z.object({
  label: z.string().min(1).max(120),
  severity: geofenceSeveritySchema.default("safe"),
  centerLatitude: z.number().min(-90).max(90),
  centerLongitude: z.number().min(-180).max(180),
  radiusMeters: z.number().positive().max(10_000),
});

export const updateParentProfileInputSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  phoneNumber: z.string().min(6).max(20).nullable().optional(),
  timezone: z.string().min(1).max(50).optional(),
});

export const updateParentSettingsInputSchema = z.object({
  riskSensitivity: z.number().int().min(1).max(3).optional(),
  alertFrequencySeconds: z.number().int().min(15).max(3600).optional(),
  pushAlertsEnabled: z.boolean().optional(),
  emailAlertsEnabled: z.boolean().optional(),
});

export const updateChildInputSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().optional(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AlertPriority = z.infer<typeof alertPrioritySchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;
export type ChildStatus = z.infer<typeof childStatusSchema>;
export type GeofenceSeverity = z.infer<typeof geofenceSeveritySchema>;
export type ChildEventType = z.infer<typeof childEventTypeSchema>;
export type AuthProvider = z.infer<typeof authProviderSchema>;
export type UserIdentity = z.infer<typeof userIdentitySchema>;
export type ParentProfile = z.infer<typeof parentProfileSchema>;
export type ChildProfile = z.infer<typeof childProfileSchema>;
export type ChildDevice = z.infer<typeof childDeviceSchema>;
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;
export type ChildDeviceMetadata = z.infer<typeof childDeviceMetadataSchema>;
export type LocationPoint = z.infer<typeof locationPointSchema>;
export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>;
export type LocationEvent = z.infer<typeof locationEventSchema>;
export type ChildSnapshot = z.infer<typeof childSnapshotSchema>;
export type AlertAction = z.infer<typeof alertActionSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type ChildEvent = z.infer<typeof childEventSchema>;
export type Geofence = z.infer<typeof geofenceSchema>;
export type PlaceSearchResult = z.infer<typeof placeSearchResultSchema>;
export type ParentSettings = z.infer<typeof parentSettingsSchema>;
export type CreatePairingCodeInput = z.infer<typeof createPairingCodeInputSchema>;
export type VerifyPairingCodeInput = z.infer<typeof verifyPairingCodeInputSchema>;
export type CreateLocationEventInput = z.infer<typeof createLocationEventInputSchema>;
export type CreateGeofenceInput = z.infer<typeof createGeofenceInputSchema>;
export type UpdateParentProfileInput = z.infer<typeof updateParentProfileInputSchema>;
export type UpdateParentSettingsInput = z.infer<typeof updateParentSettingsInputSchema>;
export type UpdateChildInput = z.infer<typeof updateChildInputSchema>;
