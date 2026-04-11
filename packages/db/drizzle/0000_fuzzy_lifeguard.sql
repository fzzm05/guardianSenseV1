CREATE TYPE "public"."alert_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('location', 'geofence', 'safety', 'system', 'device');--> statement-breakpoint
CREATE TYPE "public"."child_device_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."child_status" AS ENUM('safe', 'warning', 'danger', 'offline', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."location_source" AS ENUM('gps', 'manual', 'simulated', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pairing_code_status" AS ENUM('pending', 'verified', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('parent', 'child', 'admin');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"type" "alert_type" NOT NULL,
	"priority" "alert_priority" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"actions_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"platform" "child_device_platform" NOT NULL,
	"device_name" text,
	"app_version" text,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"status" "child_status" DEFAULT 'unknown' NOT NULL,
	"date_of_birth" timestamp,
	"current_zone_label" text,
	"last_latitude" double precision,
	"last_longitude" double precision,
	"last_accuracy_meters" double precision,
	"last_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geofences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"label" text NOT NULL,
	"center_latitude" double precision NOT NULL,
	"center_longitude" double precision NOT NULL,
	"radius_meters" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geofences_center_latitude_check" CHECK ("geofences"."center_latitude" between -90 and 90),
	CONSTRAINT "geofences_center_longitude_check" CHECK ("geofences"."center_longitude" between -180 and 180),
	CONSTRAINT "geofences_radius_meters_check" CHECK ("geofences"."radius_meters" > 0)
);
--> statement-breakpoint
CREATE TABLE "location_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"device_id" uuid,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy_meters" double precision,
	"altitude_meters" double precision,
	"speed_meters_per_second" double precision,
	"heading_degrees" double precision,
	"battery_level" double precision,
	"is_charging" boolean,
	"network_type" text,
	"os_version" text,
	"app_version" text,
	"source" "location_source" DEFAULT 'gps' NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_events_latitude_check" CHECK ("location_events"."latitude" between -90 and 90),
	CONSTRAINT "location_events_longitude_check" CHECK ("location_events"."longitude" between -180 and 180),
	CONSTRAINT "location_events_battery_level_check" CHECK ("location_events"."battery_level" is null or ("location_events"."battery_level" between 0 and 1))
);
--> statement-breakpoint
CREATE TABLE "pairing_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"child_name" text NOT NULL,
	"code" text NOT NULL,
	"status" "pairing_code_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_settings" (
	"parent_id" uuid PRIMARY KEY NOT NULL,
	"risk_sensitivity" smallint DEFAULT 2 NOT NULL,
	"alert_frequency_seconds" integer DEFAULT 60 NOT NULL,
	"push_alerts_enabled" boolean DEFAULT true NOT NULL,
	"email_alerts_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_settings_risk_sensitivity_check" CHECK ("parent_settings"."risk_sensitivity" between 1 and 3),
	CONSTRAINT "parent_settings_alert_frequency_check" CHECK ("parent_settings"."alert_frequency_seconds" between 15 and 3600)
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_devices" ADD CONSTRAINT "child_devices_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_device_id_child_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."child_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_settings" ADD CONSTRAINT "parent_settings_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_child_created_at_idx" ON "alerts" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "alerts_acknowledged_at_idx" ON "alerts" USING btree ("acknowledged_at");--> statement-breakpoint
CREATE INDEX "child_devices_child_id_idx" ON "child_devices" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "child_devices_last_seen_at_idx" ON "child_devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "children_parent_id_idx" ON "children" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "children_parent_display_name_idx" ON "children" USING btree ("parent_id","display_name");--> statement-breakpoint
CREATE INDEX "children_last_recorded_at_idx" ON "children" USING btree ("last_recorded_at");--> statement-breakpoint
CREATE INDEX "geofences_parent_id_idx" ON "geofences" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "location_events_child_recorded_at_idx" ON "location_events" USING btree ("child_id","recorded_at");--> statement-breakpoint
CREATE INDEX "location_events_device_id_idx" ON "location_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "location_events_recorded_at_idx" ON "location_events" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pairing_codes_code_key" ON "pairing_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pairing_codes_parent_status_idx" ON "pairing_codes" USING btree ("parent_id","status");--> statement-breakpoint
CREATE INDEX "pairing_codes_expires_at_idx" ON "pairing_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");