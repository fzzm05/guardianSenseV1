CREATE TABLE "device_status" (
	"device_id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"battery_level" double precision,
	"is_charging" boolean,
	"network_type" text,
	"speed_meters_per_second" double precision,
	"source" "location_source" DEFAULT 'gps' NOT NULL,
	"app_version" text,
	"os_version" text,
	"last_seen_at" timestamp with time zone NOT NULL,
	"last_location_recorded_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_status_battery_level_check" CHECK ("device_status"."battery_level" is null or ("device_status"."battery_level" between 0 and 1))
);
--> statement-breakpoint
ALTER TABLE "device_status" ADD CONSTRAINT "device_status_device_id_child_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."child_devices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "device_status" ADD CONSTRAINT "device_status_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "device_status_child_id_idx" ON "device_status" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "device_status_last_seen_at_idx" ON "device_status" USING btree ("last_seen_at");
--> statement-breakpoint
CREATE INDEX "device_status_last_location_recorded_at_idx" ON "device_status" USING btree ("last_location_recorded_at");
--> statement-breakpoint
INSERT INTO "device_status" (
	"device_id",
	"child_id",
	"battery_level",
	"is_charging",
	"network_type",
	"speed_meters_per_second",
	"source",
	"app_version",
	"os_version",
	"last_seen_at",
	"last_location_recorded_at"
)
SELECT DISTINCT ON ("device_id")
	"device_id",
	"child_id",
	"battery_level",
	"is_charging",
	"network_type",
	"speed_meters_per_second",
	"source",
	"app_version",
	"os_version",
	"recorded_at",
	"recorded_at"
FROM "location_events"
WHERE "device_id" IS NOT NULL
ORDER BY "device_id", "recorded_at" DESC;
