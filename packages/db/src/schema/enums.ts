import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["parent", "child", "admin"]);
export const childStatusEnum = pgEnum("child_status", [
  "safe",
  "warning",
  "danger",
  "offline",
  "unknown"
]);
export const childDevicePlatformEnum = pgEnum("child_device_platform", [
  "ios",
  "android",
  "web"
]);
export const locationSourceEnum = pgEnum("location_source", [
  "gps",
  "manual",
  "simulated",
  "unknown"
]);
export const alertTypeEnum = pgEnum("alert_type", [
  "location",
  "geofence",
  "safety",
  "system",
  "device"
]);
export const alertPriorityEnum = pgEnum("alert_priority", [
  "low",
  "medium",
  "high"
]);
export const geofenceSeverityEnum = pgEnum("geofence_severity", [
  "safe",
  "caution",
  "danger"
]);
export const childEventTypeEnum = pgEnum("child_event_type", [
  "zone_entered",
  "zone_exited",
  "zone_changed",
  "charging_started",
  "charging_stopped"
]);
