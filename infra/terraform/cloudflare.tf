// Cloudflare Worker — shell only.
//
// ─╴Deployment workflow╶─
//    Terraform creates the Worker with a stub (no bindings).
//    Wrangler is the single source of truth for code + bindings:
//      cd backend && npm run deploy         (code + vars)
//      wrangler secret put CLERK_SECRET_KEY (one-time)
//      wrangler secret put CLERK_WEBHOOK_SECRET (one-time)
//
//    Re-running `terraform apply` will NOT touch the deployed code
//    or bindings (ignore_changes on content, no bindings defined here).

resource "cloudflare_workers_script" "backend" {
  name        = "notebookzen-backend"
  account_id  = var.cloudflare_account_id

  module      = true

  # Wrangler is the single source of truth for code AND bindings.
  # ignore_changes covers ALL bindings so terraform apply never
  # clobbers wrangler-set vars/secrets (FRONTEND_URL, Clerk, etc.).
  lifecycle {
    ignore_changes = [
      content,
      plain_text_binding,
      secret_text_binding,
      hyperdrive_config_binding,
    ]
  }

  content = <<-EOT
    export default {
      async fetch() {
        return new Response('Deploy via: cd backend && npm run deploy')
      }
    }
  EOT

  compatibility_date  = "2024-12-01"
  compatibility_flags = ["nodejs_compat"]
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
resource "cloudflare_workers_route" "backend_default" {
  count    = var.cloudflare_zone_id == "" ? 0 : 1
  zone_id  = var.cloudflare_zone_id
  pattern  = "notebookzen-backend.${var.cloudflare_zone_name}/*"
  script_name = cloudflare_workers_script.backend.name
}
