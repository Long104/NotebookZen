import { pgTable, serial, text, integer, timestamp, unique, customType } from "drizzle-orm/pg-core";

/**
 * pgvector column type — stores a 768-dimensional float vector.
 * Dimension matches @cf/baai/bge-base-en-v1.5 (Workers AI embedding model).
 * Requires: CREATE EXTENSION IF NOT EXISTS vector;
 */
const vector = customType({
  dataType() {
    return "vector(768)";
  },
});

export const users = pgTable("User", {
  id: serial("id").primaryKey(),
  clerkId: text("clerkId").notNull().unique(),
  username: text("username"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
});

export const folders = pgTable("Folder", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
});

export const notes = pgTable("Note", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  folderId: integer("folderId").references(() => folders.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  title: text("title").notNull(),
  content: text("content"),
  embedding: vector("embedding"),
  createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
});

export const settings = pgTable(
  "Setting",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => ({
    uniqueUserKey: unique().on(table.userId, table.key),
  }),
);

export const noteLinks = pgTable(
  "NoteLink",
  {
    id: serial("id").primaryKey(),
    sourceNoteId: integer("sourceNoteId")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    targetNoteId: integer("targetNoteId")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueLink: unique().on(table.sourceNoteId, table.targetNoteId),
  }),
);
