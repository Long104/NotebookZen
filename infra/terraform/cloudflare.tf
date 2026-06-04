// Cloudflare Worker that hosts the Express backend.
//
// Code is deployed via `wrangler deploy` from ./backend (which bundles
// the worker entry + Express app). Terraform only manages the script
// metadata and bindings so the actual binary stays out of state.

resource "cloudflare_workers_script" "backend" {
  name        = "notebookzen-backend"
  account_id  = var.cloudflare_account_id

  compatibility_date  = "2024-09-01"
  compatibility_flags = ["nodejs_compat"]

  vars = {
    FRONTEND_URL = "https://${vercel_project.frontend.name}.vercel.app"
    AI_PROVIDER  = var.ai_provider
  }

  secret_text_bindings = [
    {
      name = "DATABASE_URL"
      text = "postgresql://postgres.${supabase_project.notebookzen.id}:${var.supabase_db_password}@aws-0-${var.supabase_region}.pooler.supabase.com:6543/postgres"
    },
    {
      name = "CLERK_SECRET_KEY"
      text = var.clerk_secret_key
    },
    {
      name = "CLERK_WEBHOOK_SECRET"
      text = var.clerk_webhook_secret
    },
    {
      name = "OPENROUTER_API_KEY"
      text = var.openrouter_api_key
    },
    {
      name = "OPENROUTER_MODEL"
      text = var.openrouter_model
    },
    {
      name = "GOOGLE_API_KEY"
      text = var.google_api_key
    },
    {
      name = "GOOGLE_MODEL"
      text = var.google_model
    },
  ]
}

// Public route on workers.dev so the Vercel frontend can reach the API.
// If you own a custom domain, add a `cloudflare_worker_route` resource
// here and point it at this worker.
resource "cloudflare_worker_route" "backend_default" {
  count    = var.cloudflare_zone_id == "" ? 0 : 1
  zone_id  = var.cloudflare_zone_id
  pattern  = "${var.cloudflare_backend_subdomain}.${var.cloudflare_zone_name}/*"
  script_name = cloudflare_workers_script.backend.name
}
