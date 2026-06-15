CREATE TABLE "NoteLink" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceNoteId" integer NOT NULL,
	"targetNoteId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "NoteLink_sourceNoteId_targetNoteId_unique" UNIQUE("sourceNoteId","targetNoteId")
);
--> statement-breakpoint
CREATE TABLE "Note" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "Setting_userId_key_unique" UNIQUE("userId","key")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerkId" text NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "User_clerkId_unique" UNIQUE("clerkId"),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_sourceNoteId_Note_id_fk" FOREIGN KEY ("sourceNoteId") REFERENCES "public"."Note"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_targetNoteId_Note_id_fk" FOREIGN KEY ("targetNoteId") REFERENCES "public"."Note"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;