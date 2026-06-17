// ─── Neon Postgres ──────────────────────────────────────────────────────────
//
// Replaces Supabase as the database for NotebookZen.
//
// WHY: Supabase + Cloudflare Hyperdrive suffered chronic connection pool
// exhaustion (Worker hangs, 16% error rate). Neon's serverless HTTP driver
// makes each query a stateless HTTP request — no pool to exhaust.
//
// After `terraform apply`:
//   1. Run migrations:  psql "$(terraform output -raw neon_database_url)" -f backend/db/migrations/neon_init.sql
//   2. Set Worker secret: cd backend && wrangler secret put DATABASE_URL
//      Paste the value from: terraform output -raw neon_database_url

resource "neon_project" "notebookzen" {
  name       = "notebookzen"
  region_id  = var.neon_region
  pg_version = 16

  # Configure the default branch endpoint for free-tier responsiveness
  # suspend_timeout = 0  → always-on (free tier auto-suspends after 5 min anyway)
  branch = {
    endpoint = {
      min_cu          = 0.25
      max_cu          = 0.25
      suspend_timeout = 0
    }
  }
}

resource "neon_role" "notebookzen" {
  project_id = neon_project.notebookzen.id
  branch_id  = neon_project.notebookzen.branch.id
  name       = "notebookzen"
}

resource "neon_database" "notebookzen" {
  project_id = neon_project.notebookzen.id
  branch_id  = neon_project.notebookzen.branch.id
  name       = "notebookzen"
  owner_name = neon_role.notebookzen.name
}
