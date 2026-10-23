CREATE TYPE "public"."diagram_type" AS ENUM('mindmap', 'flowchart', 'timeline');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('transcribiendo', 'resumiendo', 'listo', 'error');--> statement-breakpoint
CREATE TABLE "diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"type" "diagram_type" NOT NULL,
	"mermaid_code" text NOT NULL,
	CONSTRAINT "diagrams_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_seconds" integer,
	"language" text DEFAULT 'es' NOT NULL,
	"status" "meeting_status" DEFAULT 'transcribiendo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"resumen" text NOT NULL,
	"decisiones" jsonb NOT NULL,
	"tareas" jsonb NOT NULL,
	"temas" jsonb NOT NULL,
	"model" text NOT NULL,
	CONSTRAINT "summaries_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"text" text NOT NULL,
	"segments" jsonb NOT NULL,
	CONSTRAINT "transcripts_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
ALTER TABLE "diagrams" ADD CONSTRAINT "diagrams_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;