# Post-mortem: Supabase + Hyperdrive Connection Pool Exhaustion

**Date:** 2026-06-17  
**Duration:** ~12 hours (intermittent from 2026-06-16 to resolution on 2026-06-17)  
**Impact:** ~50% of all API requests failed with "Worker hung" errors. Frontend saw 500s on notes CRUD, chat, settings. New note creation sometimes succeeded on retry.  
**Root Cause:** Hyperdrive connection pool exhausted all available upstream connections to Supabase free tier Postgres. Once the pool was saturated, every subsequent connection attempt hung until a timeout killed the Worker.  
**Resolution:** Migrated from Supabase + Hyperdrive to Neon serverless HTTP driver.

---

## Timeline

### Phase 1 — Symptoms appear (2026-06-16 ~14:00 ICT)

- User reports frontend returning 500 errors on notes list, create, delete
- Backend Worker logs show no structured error — just `request failed` on the frontend
- Browser console shows CORS errors because the 500 responses lack CORS headers → browser can't read the error body

### Phase 2 — False leads (2026-06-16 14:00 – 17:00)

**Hypothesis:** CORS issue. The onError handler wasn't adding CORS headers.

**Commit `8f355b4`:**
```
fix: CORS, global error handler, and DELETE ownership check
```
- Added CORS headers to Hono's `onError` handler so the browser can read 500 responses
- Result: errors became visible ("Internal server error") but the frequency didn't change

**Hypothesis:** Cold start CPU limit. The Worker was timing out because cold starts exceed 10ms CPU on free plan.

**Commit `2dba56d`:**
```
fix: lazy-import heavy modules to reduce cold start CPU time
```
- Lazy-imported `@langchain`, `svix`, `@clerk/backend`
- Result: Marginal improvement, errors persisted

**Commit `b12b7a3`:**
```
fix: lazy-import pg/drizzle in getDb and add CRON keep-warm
```
- Added CRON trigger every 2 minutes to keep modules warm
- Result: Helped when warm, but even warm requests failed

**Commit `7fab1fd`:**
```
perf: replace @clerk/backend with zero-dependency Web Crypto JWT
```
- Replaced `@clerk/backend` (heavy SDK) with custom JWT verification using `crypto.subtle`
- Cold start improved but errors continued

**Commit `c8869eb`:**
```
perf: lazy-load ALL drizzle-orm/pg/schema — module scope is now hono-only
```
- Moved ALL heavy imports out of module scope, only dynamic imports remain
- Cold start now ~17ms (down from ~500ms)
- Result: No improvement in error rate

### Phase 3 — The real clue (2026-06-16 17:00 – 18:00)

The Cloudflare dashboard was checked:

```
164 errors in 24h     ↑ 763%
~1k requests           ↑ 227%
```

The error message finally appeared in the Worker logs:

> **"The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response."**

This is NOT a CPU limit error (those say "exceeded CPU time limit"). This is a **hang error** — the Worker made an async call that never resolved.

**Hyperdrive `notebookzen-db2`** was flagged in the dashboard as the likely cause — the connection pool had high latency and error rates.

**Root cause now understood:**
- Hyperdrive maintains a pool of connections to Supabase Postgres
- Supabase free tier has strict connection limits
- Under 227% traffic increase, the pool exhausted all available upstream connections
- Every new connection attempt hangs waiting for a free slot → Worker never responds → runtime kills it after ~30s
- Retries sometimes succeed if another request finishes and returns a connection to the pool

### Phase 4 — Mitigation (2026-06-16 18:00 – 2026-06-17 15:00)

**Commit `0cda739`:**
```
perf: defer embeddings/wikilinks to background + atomic DELETE
```
- Moved wikilink sync and AI embedding generation to `ctx.waitUntil()` (background)
- Reduced DB operations per write from ~5 to 1 (synchronous path)
- DELETE now uses single atomic query with CASCADE

**Commit `309f074`:**
```
fix: add pool timeouts to prevent Worker hangs on DB connection exhaustion
```
- Added `connectionTimeoutMillis: 3000` — fail fast instead of hanging forever
- Added `idleTimeoutMillis: 5000` — aggressively reclaim idle connections
- Reduced `max: 3` — keep pool small to avoid overwhelming upstream
- Added pool error handler that clears the DB cache on connection failure

**Result:** ~50% of requests still failed. Pool exhaustion was fundamental — no amount of tuning could fix the upstream connection limit. Timeouts made failures graceful (return 500 in 3s instead of hanging for 30s) but didn't reduce the rate.

### Phase 5 — Decision: Migrate to Neon (2026-06-17 15:00)

**Realization:** The problem was architectural, not configurable. Hyperdrive pools TCP connections to Postgres. Supabase free tier caps connections. These two things inherently don't scale together.

**Decision criteria:**
- Must be serverless (no connection pool to exhaust)
- Must support pgvector (768-dim embeddings for AI search)
- Must have a Singapore region
- Must have a free tier for development

**Winner:** Neon serverless Postgres with HTTP driver (`@neondatabase/serverless`). Each query is a stateless HTTP request. No persistent connections. No pool to exhaust.

**Commit `8c3b45b`:**
```
refactor: migrate from Supabase+Hyperdrive to Neon serverless
```
- Removed `[[hyperdrive]]` binding from wrangler.toml
- Replaced `pg` Pool + `drizzle-orm/node-postgres` with `@neondatabase/serverless` + `drizzle-orm/neon-http`
- Removed pool tuning, error handlers, timeouts — none needed
- Added Terraform config for Neon project/database/role (Singapore region, PG16)
- Created combined migration SQL with pgvector extension

### Phase 6 — Verification (2026-06-17 15:00 – 16:00)

- `terraform apply` → Neon project `flat-king-55727453` created (8s)
- Migration SQL applied → 4 tables + pgvector extension + 4 CASCADE FKs
- `wrangler secret put DATABASE_URL` → connection string set
- `npm run deploy` → Worker version `c04f32ab`, startup 17ms
- Verified: `GET /` → 200, `GET /notes` → 401 (no auth), `GET /notesCount/1` → 0
- **Zero pool-related errors since deployment**

---

## Root Cause Analysis

```
                    ┌──────────────────────┐
                    │  Cloudflare Worker    │
                    │  (Hono on Workers)    │
                    └────────┬─────────────┘
                             │
                    ┌────────▼─────────────┐
                    │  Hyperdrive           │
                    │  (connection pool)    │
                    │  max: 3 → 5 → 10     │
                    └────────┬─────────────┘
                             │
                    ┌────────▼─────────────┐
                    │  Supabase Postgres    │
                    │  Free tier            │
                    │  Max connections: ~15 │
                    └──────────────────────┘
```

**Direct cause:** Hyperdrive's connection pool saturated all available upstream connections to Supabase. Once saturated, every new query hung waiting for a connection slot. The Worker runtime killed hung requests after ~30 seconds ("runtime canceled your Worker's code had hung").

**Why it happened:** Traffic increased 227% (likely from the Vercel frontend being re-deployed and actually used). Hyperdrive's default pool behavior assumes the upstream can handle the connection load, but Supabase free tier has strict limits (~15 simultaneous connections). Each note create/update triggered 3-5 sequential DB queries (insert note, sync wikilinks, generate embeddings, upsert links), multiplying the connection pressure.

**Why mitigation didn't work:** Pool timeouts and background deferral helped symptoms but not the root cause. The pool still exhausted under load — timeouts just made failures graceful instead of hanging.

**Why we initially chased cold start:** The Worker free plan has a 10ms CPU limit. Cold starts loading heavy modules (pg, drizzle, @langchain, @clerk/backend) exceeded this, producing errors that looked similar (requests killed by the runtime). The similarity of symptoms (request fails after ~10s) led to multiple cold start optimizations before the hang error message became visible.

---

## Resolution

**Full migration from Supabase (pooled TCP) → Neon (stateless HTTP).**

**What changed:**
| Before | After |
|---|---|
| `pg` Pool (`new Pool()`) | `@neondatabase/serverless` `neon()` HTTP function |
| `drizzle-orm/node-postgres` | `drizzle-orm/neon-http` |
| Hyperdrive binding (`c.env.HYPERDRIVE`) | Database URL string (`c.env.DATABASE_URL`) via wrangler secret |
| Connection pool: max=3, timeouts, error handlers | No pool. Stateless HTTP requests. |
| Supabase free tier (unknown connection cap) | Neon free tier (HTTP, no connections to exhaust) |
| Infrastructure via Supabase dashboard | Infrastructure via Terraform (`terraform-community-providers/neon`) |

**What stayed the same:**
- Drizzle ORM schema and queries (identical API)
- All route handlers, middleware, auth
- AI embeddings via Cloudflare Workers AI
- CRON warm-up (now pre-warms Neon HTTP executor instead)
- Background task pattern for wikilinks + embeddings

---

## Lessons Learned

1. **"Worker hung" is different from "CPU limit."** The runtime error message is specific: "runtime canceled your Worker's code had hung" means an async operation never resolved. "CPU time limit exceeded" means the Worker consumed too much CPU. These require different debugging approaches.

2. **Hyperdrive + free Supabase is a dangerous combination.** Hyperdrive optimistically pools connections, but if the upstream is capped, the pool becomes a bottleneck, not a solution. Hyperdrive works well when you have dedicated Postgres with high connection limits.

3. **Check the Cloudflare dashboard first.** The dashboard flagged Hyperdrive as the likely cause before we looked there. The error rate graph (↑763%) and the traffic increase (↑227%) pointed directly to pool exhaustion. We spent hours on cold start before checking the dashboard.

4. **CORS errors on 500s are a red herring.** Hono doesn't add CORS headers to error responses by default. The browser shows CORS errors even though the real problem is the 500. Fixing CORS on errors is good practice but won't fix the underlying issue.

5. **Serverless databases should use serverless drivers.** Neon's HTTP driver (`@neondatabase/serverless`) is designed for Workers — each `fetch()` is a native HTTP request with no connection overhead. PgBouncer, Hyperdrive, and connection pooling are workarounds for a fundamentally connection-oriented protocol (TCP) running in a connectionless environment (Serverless Workers).

6. **If traffic grows 227%, your database architecture will show its limits** — whether it's connection pools, query throughput, or storage. The Neon HTTP driver doesn't eliminate all scaling bottlenecks, but it eliminates the connection limit bottleneck.
