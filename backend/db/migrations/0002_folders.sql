-- Create Folder table
CREATE TABLE IF NOT EXISTS "Folder" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" text NOT NULL,
  "createdAt" timestamp(3) DEFAULT now() NOT NULL
);

-- Add folderId column to Note (nullable — uncategorized notes have NULL)
ALTER TABLE "Note" ADD COLUMN "folderId" integer REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
