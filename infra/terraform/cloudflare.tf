// Cloudflare Worker that hosts the Hono backend.
//
// ─╴Deployment workflow╶─
//    Terraform creates the Worker with a stub + all env bindings.
//    Then `cd backend && npm run deploy` bundles and overwrites
//    the stub with the real application code.
//
//    Re-running `terraform apply` will reset the code to this stub,
//    so you must re-deploy with `npm run deploy` afterward.

resource "cloudflare_workers_script" "backend" {
  name        = "notebookzen-backend"
  account_id  = var.cloudflare_account_id

  content = <<-EOT
    export default {
      async fetch(request, env) {
        return new Response(
          'Deploy backend code via: cd backend && npm run deploy',
          { status: 200 }
        );
      }
    }
  EOT

  compatibility_date  = "2024-12-01"
  compatibility_flags = ["nodejs_compat"]

  vars = {
    FRONTEND_URL = "https://${vercel_project.frontend.name}.vercel.app"
    AI_PROVIDER  = var.ai_provider
  }

  secret_text_bindings = [
    {
      name = "SUPABASE_URL"
      text = "https://${supabase_project.notebookzen.id}.supabase.co"
    },
    {
      name = "SUPABASE_SERVICE_ROLE_KEY"
      text = var.supabase_service_role_key
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
