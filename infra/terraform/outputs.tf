output "supabase_project_id" {
  description = "Supabase project ID"
  value       = supabase_project.notebookzen.id
}

output "supabase_project_url" {
  description = "Supabase project dashboard URL"
  value       = "https://supabase.com/dashboard/project/${supabase_project.notebookzen.id}"
}

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

output "supabase_api_url" {
  description = "Supabase REST API URL (for SUPABASE_URL env var)"
  value       = "https://${supabase_project.notebookzen.id}.supabase.co"
}
