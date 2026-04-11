ALTER TABLE "pairing_codes"
ADD COLUMN "child_id" uuid;
--> statement-breakpoint
ALTER TABLE "pairing_codes"
ADD CONSTRAINT "pairing_codes_child_id_children_id_fk"
FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "pairing_codes_parent_child_status_idx"
ON "pairing_codes" USING btree ("parent_id","child_id","status");
