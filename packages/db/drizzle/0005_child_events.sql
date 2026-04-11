CREATE TYPE "public"."child_event_type" AS ENUM(
	'zone_entered',
	'zone_exited',
	'zone_changed',
	'charging_started',
	'charging_stopped'
);
--> statement-breakpoint
CREATE TABLE "child_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"type" "child_event_type" NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child_events" ADD CONSTRAINT "child_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "child_events_child_created_at_idx" ON "child_events" USING btree ("child_id","created_at");
--> statement-breakpoint
CREATE INDEX "child_events_created_at_idx" ON "child_events" USING btree ("created_at");
