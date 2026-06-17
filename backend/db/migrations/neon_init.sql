-- ───────────────────────────────────────────────────────────────────────────
-- NotebookZen — Neon schema initialization
-- ───────────────────────────────────────────────────────────────────────────
--
-- Run this after creating the Neon project via Terraform:
--   psql "$(terraform output -raw neon_database_url)" -f backend/db/migrations/neon_init.sql
--
-- This combines drizzle migrations 0000 + 0001 into a single clean script.
-- Neon supports pgvector natively (no special setup needed).

-- pgvector extension for AI embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
    "id" serial PRIMARY KEY NOT NULL,
    "clerkId" text NOT NULL,
    "username" text,
    "email" text NOT NULL,
    "createdAt" timestamp(3) DEFAULT now() NOT NULL,
    CONSTRAINT "User_clerkId_unique" UNIQUE("clerkId"),
    CONSTRAINT "User_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "Note" (
    "id" serial PRIMARY KEY NOT NULL,
    "userId" integer NOT NULL,
    "title" text NOT NULL,
    "content" text,
    "embedding" vector(768),
    "createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "Setting" (
    "id" serial PRIMARY KEY NOT NULL,
    "userId" integer NOT NULL,
    "key" text NOT NULL,
    "value" text NOT NULL,
    CONSTRAINT "Setting_userId_key_unique" UNIQUE("userId", "key")
);

CREATE TABLE IF NOT EXISTS "NoteLink" (
    "id" serial PRIMARY KEY NOT NULL,
    "sourceNoteId" integer NOT NULL,
    "targetNoteId" integer NOT NULL,
    "createdAt" timestamp(3) DEFAULT now() NOT NULL,
    CONSTRAINT "NoteLink_sourceNoteId_targetNoteId_unique" UNIQUE("sourceNoteId", "targetNoteId")
);

-- ─── Foreign Keys (CASCADE on delete) ──────────────────────────────────────

ALTER TABLE "Note"
    ADD CONSTRAINT "Note_userId_User_id_fk"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "Setting"
    ADD CONSTRAINT "Setting_userId_User_id_fk"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "NoteLink"
    ADD CONSTRAINT "NoteLink_sourceNoteId_Note_id_fk"
    FOREIGN KEY ("sourceNoteId") REFERENCES "public"."Note"("id")
    ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "NoteLink"
    ADD CONSTRAINT "NoteLink_targetNoteId_Note_id_fk"
    FOREIGN KEY ("targetNoteId") REFERENCES "public"."Note"("id")
    ON DELETE cascade ON UPDATE cascade;
