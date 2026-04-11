import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import {
  alertPriorityEnum,
  alertTypeEnum,
  childDevicePlatformEnum,
  childEventTypeEnum,
  childStatusEnum,
  geofenceSeverityEnum,
  locationSourceEnum,
  userRoleEnum
} from "./enums";

const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firebaseUid: text("firebase_uid").notNull(),
    role: userRoleEnum("role").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    ...timestampColumns
  },
  (table) => [
    uniqueIndex("users_firebase_uid_key").on(table.firebaseUid),
    index("users_email_idx").on(table.email)
  ]
);

export const parents = pgTable(
  "parents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    phoneNumber: text("phone_number"),
    timezone: text("timezone").notNull().default("UTC"),
    ...timestampColumns
  },
  (table) => [uniqueIndex("parents_user_id_key").on(table.userId)]
);

export const children = pgTable(
  "children",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    status: childStatusEnum("status").notNull().default("unknown"),
    dateOfBirth: timestamp("date_of_birth", { mode: "string" }),
    currentZoneLabel: text("current_zone_label"),
    lastLatitude: doublePrecision("last_latitude"),
    lastLongitude: doublePrecision("last_longitude"),
    lastAccuracyMeters: doublePrecision("last_accuracy_meters"),
    lastRecordedAt: timestamp("last_recorded_at", { withTimezone: true }),
    ...timestampColumns
  },
  (table) => [
    index("children_parent_id_idx").on(table.parentId),
    index("children_parent_display_name_idx").on(table.parentId, table.displayName),
    index("children_last_recorded_at_idx").on(table.lastRecordedAt)
  ]
);

export const childDevices = pgTable(
  "child_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
    platform: childDevicePlatformEnum("platform").notNull(),
    deviceName: text("device_name"),
    deviceBrand: text("device_brand"),
    deviceModel: text("device_model"),
    osVersion: text("os_version"),
    appVersion: text("app_version"),
    authToken: text("auth_token"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestampColumns
  },
  (table) => [
    index("child_devices_child_id_idx").on(table.childId),
    index("child_devices_last_seen_at_idx").on(table.lastSeenAt),
    uniqueIndex("child_devices_auth_token_key").on(table.authToken)
  ]
);

export const deviceStatus = pgTable(
  "device_status",
  {
    deviceId: uuid("device_id")
      .primaryKey()
      .references(() => childDevices.id, { onDelete: "cascade" }),
    childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
    batteryLevel: doublePrecision("battery_level"),
    isCharging: boolean("is_charging"),
    networkType: text("network_type"),
    speedMetersPerSecond: doublePrecision("speed_meters_per_second"),
    source: locationSourceEnum("source").notNull().default("gps"),
    appVersion: text("app_version"),
    osVersion: text("os_version"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    lastLocationRecordedAt: timestamp("last_location_recorded_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("device_status_child_id_idx").on(table.childId),
    index("device_status_last_seen_at_idx").on(table.lastSeenAt),
    index("device_status_last_location_recorded_at_idx").on(table.lastLocationRecordedAt),
    check(
      "device_status_battery_level_check",
      sql`${table.batteryLevel} is null or (${table.batteryLevel} between 0 and 1)`
    )
  ]
);

export const parentSettings = pgTable("parent_settings", {
  parentId: uuid("parent_id")
    .primaryKey()
    .references(() => parents.id, { onDelete: "cascade" }),
  riskSensitivity: smallint("risk_sensitivity").notNull().default(2),
  alertFrequencySeconds: integer("alert_frequency_seconds").notNull().default(60),
  pushAlertsEnabled: boolean("push_alerts_enabled").notNull().default(true),
  emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(false),
  telegramChatId: text("telegram_chat_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("parent_settings_risk_sensitivity_check", sql`${table.riskSensitivity} between 1 and 3`),
  check(
    "parent_settings_alert_frequency_check",
    sql`${table.alertFrequencySeconds} between 15 and 3600`
  )
]);

export const locationEvents = pgTable(
  "location_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => childDevices.id, { onDelete: "set null" }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    accuracyMeters: doublePrecision("accuracy_meters"),
    altitudeMeters: doublePrecision("altitude_meters"),
    speedMetersPerSecond: doublePrecision("speed_meters_per_second"),
    headingDegrees: doublePrecision("heading_degrees"),
    batteryLevel: doublePrecision("battery_level"),
    isCharging: boolean("is_charging"),
    networkType: text("network_type"),
    osVersion: text("os_version"),
    appVersion: text("app_version"),
    source: locationSourceEnum("source").notNull().default("gps"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("location_events_child_recorded_at_idx").on(table.childId, table.recordedAt),
    index("location_events_device_id_idx").on(table.deviceId),
    index("location_events_recorded_at_idx").on(table.recordedAt),
    check("location_events_latitude_check", sql`${table.latitude} between -90 and 90`),
    check("location_events_longitude_check", sql`${table.longitude} between -180 and 180`),
    check(
      "location_events_battery_level_check",
      sql`${table.batteryLevel} is null or (${table.batteryLevel} between 0 and 1)`
    )
  ]
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
    type: alertTypeEnum("type").notNull(),
    priority: alertPriorityEnum("priority").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    actionsJson: jsonb("actions_json").notNull().default(sql`'[]'::jsonb`),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("alerts_child_created_at_idx").on(table.childId, table.createdAt),
    index("alerts_acknowledged_at_idx").on(table.acknowledgedAt)
  ]
);

export const childEvents = pgTable(
  "child_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
    type: childEventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("child_events_child_created_at_idx").on(table.childId, table.createdAt),
    index("child_events_created_at_idx").on(table.createdAt)
  ]
);

export const geofences = pgTable(
  "geofences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    severity: geofenceSeverityEnum("severity").notNull().default("safe"),
    centerLatitude: doublePrecision("center_latitude").notNull(),
    centerLongitude: doublePrecision("center_longitude").notNull(),
    radiusMeters: doublePrecision("radius_meters").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns
  },
  (table) => [
    index("geofences_parent_id_idx").on(table.parentId),
    check("geofences_center_latitude_check", sql`${table.centerLatitude} between -90 and 90`),
    check("geofences_center_longitude_check", sql`${table.centerLongitude} between -180 and 180`),
    check("geofences_radius_meters_check", sql`${table.radiusMeters} > 0`)
  ]
);

export const usersRelations = relations(users, ({ one }) => ({
  parent: one(parents, {
    fields: [users.id],
    references: [parents.userId]
  })
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, {
    fields: [parents.userId],
    references: [users.id]
  }),
  children: many(children),
  geofences: many(geofences),
  settings: one(parentSettings, {
    fields: [parents.id],
    references: [parentSettings.parentId]
  })
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  parent: one(parents, {
    fields: [children.parentId],
    references: [parents.id]
  }),
  devices: many(childDevices),
  deviceStatuses: many(deviceStatus),
  events: many(childEvents),
  locationEvents: many(locationEvents),
  alerts: many(alerts)
}));

export const childDevicesRelations = relations(childDevices, ({ one, many }) => ({
  child: one(children, {
    fields: [childDevices.childId],
    references: [children.id]
  }),
  status: one(deviceStatus, {
    fields: [childDevices.id],
    references: [deviceStatus.deviceId]
  }),
  locationEvents: many(locationEvents)
}));

export const deviceStatusRelations = relations(deviceStatus, ({ one }) => ({
  child: one(children, {
    fields: [deviceStatus.childId],
    references: [children.id]
  }),
  device: one(childDevices, {
    fields: [deviceStatus.deviceId],
    references: [childDevices.id]
  })
}));

export const parentSettingsRelations = relations(parentSettings, ({ one }) => ({
  parent: one(parents, {
    fields: [parentSettings.parentId],
    references: [parents.id]
  })
}));

export const locationEventsRelations = relations(locationEvents, ({ one }) => ({
  child: one(children, {
    fields: [locationEvents.childId],
    references: [children.id]
  }),
  device: one(childDevices, {
    fields: [locationEvents.deviceId],
    references: [childDevices.id]
  })
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  child: one(children, {
    fields: [alerts.childId],
    references: [children.id]
  })
}));

export const childEventsRelations = relations(childEvents, ({ one }) => ({
  child: one(children, {
    fields: [childEvents.childId],
    references: [children.id]
  })
}));

export const geofencesRelations = relations(geofences, ({ one }) => ({
  parent: one(parents, {
    fields: [geofences.parentId],
    references: [parents.id]
  })
}));
