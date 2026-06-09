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
  ]
}

// CNAME record pointing notebookzen.pantorn.site → Vercel (DNS-only / grey cloud).
// Must NOT be proxied (orange cloud) so Vercel can issue its own SSL cert.
resource "cloudflare_record" "frontend_dns" {
  count    = var.cloudflare_zone_id == "" ? 0 : 1
  zone_id  = var.cloudflare_zone_id
  name     = var.cloudflare_frontend_subdomain
  type     = "CNAME"
  content  = "cname.vercel-dns.com"
  proxied  = false
  comment  = "NotebookZen frontend → Vercel (DNS-only, Vercel issues its own cert)"
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
