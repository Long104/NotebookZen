import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const users = pgTable("User", {
  id: serial("id").primaryKey(),
  clerkId: text("clerkId").notNull().unique(),
  username: text("username"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
})

export const notes = pgTable("Note", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
})

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
)

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
)
