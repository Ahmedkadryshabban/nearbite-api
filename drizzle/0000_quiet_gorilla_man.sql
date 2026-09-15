CREATE TYPE "public"."role" AS ENUM('admin', 'customer');--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" integer NOT NULL,
	"description" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'customer' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" varchar(512),
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"geohash" varchar(12) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendors_geohash_idx" ON "vendors" USING btree ("geohash");--> statement-breakpoint
CREATE INDEX "vendors_lat_lng_idx" ON "vendors" USING btree ("lat","lng");