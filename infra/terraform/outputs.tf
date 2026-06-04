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
  value       = "https://${cloudflare_workers_script.backend.subdomain}.workers.dev"
}

output "worker_name" {
  description = "Cloudflare Worker script name"
  value       = cloudflare_workers_script.backend.name
}

output "frontend_url" {
  description = "Vercel frontend deployment URL"
  value       = "https://${vercel_project.frontend.name}.vercel.app"
}

output "database_connection_string" {
  description = "PostgreSQL connection string (pooler)"
  value       = "postgresql://postgres.${supabase_project.notebookzen.id}:${var.supabase_db_password}@aws-0-${var.supabase_region}.pooler.supabase.com:6543/postgres"
  sensitive   = true
}
