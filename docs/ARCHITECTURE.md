# NoteBookZen Architecture Documentation

## Overview

NoteBookZen is a full-stack note-taking app with authentication via Clerk and database storage via Prisma with PostgreSQL.

---

## 1. Authentication Flow (Clerk)

### How Login Works

1. User visits frontend → clicks "Sign In" (Clerk widget)
2. Clerk handles login/registration
3. Clerk returns a JWT token in the browser
4. Frontend stores token (Clerk manages this automatically)
5. All API requests include: `Authorization: Bearer <token>`

### Token Verification (Backend)

```js
// middleware/auth.js
const { verifyToken } = require("@clerk/backend");

async function requireAuth(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const { sub: userId } = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  req.auth = { userId }; // userId = Clerk's user ID (clerkId)
  next();
}
```

---

## 2. Webhook Sync (Clerk → Prisma)

### Why Webhooks?

Clerk is the source of truth for user data. When a user signs up, updates, or deletes their account, Clerk sends a webhook to your backend to keep your database in sync.

### Webhook Handlers

```js
// user.created & user.updated (idempotent with upsert)
const user = await prisma.user.upsert({
  where: { clerkId: id },
  update: { username, email },
  create: { clerkId: id, username, email },
});

// user.deleted (safe - won't error if not found)
await prisma.user.deleteMany({
  where: { clerkId: id },
});
```

---

## 3. Database Schema (Prisma)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  clerkId   String   @unique      // Clerk's user ID
  username  String?              // Display name (nullable)
  email     String   @unique
  createdAt DateTime @default(now())
  notes     Note[]
}

model Note {
  id        Int      @id @default(autoincrement())
  userId    Int                      // Foreign key to User
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  content   String?
  createdAt DateTime @default(now())
}
```

---

## 4. How the System Knows Which User Is Logged In

```
JWT Token (contains clerkId)
        │
        ▼
requireAuth middleware
        │
        ▼
req.auth.userId = "user_abc123"
        │
        ▼
Prisma query filters by clerkId
        │
        ▼
Result: Only User A's notes returned
```

### Every CRUD Query Includes clerkId Filter

```js
// GET /notes
app.get("/notes", requireAuth, async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { user: { clerkId: req.auth.userId } },
  });
  res.json(notes);
});

// POST /notes
app.post("/notes", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { clerkId: req.auth.userId },
  });
  const newNote = await prisma.note.create({
    data: {
      title: req.body.title,
      content: req.body.content,
      userId: user.id,  // Internal integer ID
    },
  });
});
```

---

## 5. Architecture Flow Diagram

### Complete Request Flow

```
BROWSER                    CLERK              EXPRESS BACKEND           POSTGRESQL
   │                          │                     │                        │
   │  Sign In Click          │                     │                        │
   │────────────────────────>│                     │                        │
   │                          │                     │                        │
   │  JWT Token              │                     │                        │
   │<────────────────────────│                     │                        │
   │                          │                     │                        │
   │  GET /notes             │                     │                        │
   │  Authorization: Bearer <token>               │                        │
   │────────────────────────>│                     │                        │
   │                          │  verifyToken()      │                        │
   │                          │  returns clerkId    │                        │
   │                          │────────────────────>│                        │
   │                          │                     │                        │
   │                          │       req.auth.userId = "user_123"          │
   │                          │────────────────────>│                        │
   │                          │                     │                        │
   │                          │  SELECT * FROM note │                        │
   │                          │  WHERE user.clerkId = "user_123"            │
   │                          │────────────────────>│                        │
   │                          │                     │                        │
   │                          │       Notes (only User A's)                 │
   │                          │<────────────────────│                        │
   │                          │                     │                        │
   │  [{title: "My Note",...}]                     │                        │
   │<────────────────────────│                     │                        │
```

### Menu Page Data Flow

```
1. User navigates to menu page (/)
2. Frontend calls: GET http://localhost:8000/notes
   Headers: Authorization: Bearer <token>

3. Backend: requireAuth → verifyToken → req.auth.userId = "user_123"

4. Prisma: prisma.note.findMany({ where: { user: { clerkId: "user_123" } } })

5. Result: Only notes WHERE user.clerkId = "user_123" are returned
```

---

## 6. Summary

| Component | Role |
|-----------|------|
| **Clerk** | Authentication, user management, JWT token issuance |
| **Webhooks** | Sync Clerk user events (created/updated/deleted) to PostgreSQL |
| **Prisma** | ORM for PostgreSQL, type-safe database queries |
| **Express API** | CRUD endpoints protected by `requireAuth` middleware |
| **Frontend** | Next.js app, uses Clerk for login, calls backend APIs |

### Key Insight: Account Isolation

The system knows "this is a different account" because:
- Every JWT token contains a unique `clerkId`
- The `requireAuth` middleware extracts this `clerkId`
- Every Prisma query filters by `clerkId`
- User A's notes are never returned to User B
