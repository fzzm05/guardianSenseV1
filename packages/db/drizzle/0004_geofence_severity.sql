CREATE TYPE "public"."geofence_severity" AS ENUM('safe', 'caution', 'danger');
--> statement-breakpoint
ALTER TABLE "geofences"
ADD COLUMN "severity" "geofence_severity" DEFAULT 'safe' NOT NULL;
