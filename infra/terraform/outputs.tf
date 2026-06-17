output "backend_url" {
  description = "Cloudflare Worker backend URL"
  value       = var.cloudflare_zone_id == "" ? "https://${cloudflare_workers_script.backend.name}.<your-subdomain>.workers.dev" : "https://notebookzen-backend.${var.cloudflare_zone_name}"
}

output "worker_name" {
  description = "Cloudflare Worker script name"
  value       = cloudflare_workers_script.backend.name
}

output "frontend_url" {
  description = "Vercel frontend deployment URL"
  value       = "https://${vercel_project.frontend.name}.vercel.app"
}

output "frontend_custom_domain_url" {
  description = "Custom domain URL for the frontend"
  value       = var.cloudflare_zone_id == "" ? "" : "https://${var.cloudflare_frontend_subdomain}.${var.cloudflare_zone_name}"
}

// ─── Neon ───────────────────────────────────────────────────────────────────

output "neon_project_id" {
  description = "Neon project ID"
  value       = neon_project.notebookzen.id
}

output "neon_database_url" {
  description = "Neon database URL (set as Worker secret DATABASE_URL)"
  value       = "postgresql://${neon_role.notebookzen.name}:${neon_role.notebookzen.password}@${neon_project.notebookzen.branch.endpoint.host}/${neon_database.notebookzen.name}?sslmode=require"
  sensitive   = true
}

output "neon_psql_command" {
  description = "Ready-to-run psql command for running migrations"
  value       = "psql \"$(terraform output -raw neon_database_url)\" -f backend/db/migrations/neon_init.sql"
}
