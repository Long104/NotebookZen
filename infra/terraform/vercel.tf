resource "vercel_project" "frontend" {
  name      = "notebookzen"
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  root_directory = "frontend"
}

resource "vercel_project_domain" "frontend_custom_domain" {
  count     = var.cloudflare_zone_id == "" ? 0 : 1
  project_id = vercel_project.frontend.id
  domain     = "${var.cloudflare_frontend_subdomain}.${var.cloudflare_zone_name}"
}

resource "vercel_project_environment_variable" "backend_url" {
  project_id = vercel_project.frontend.id
  key        = "NEXT_PUBLIC_BACKEND_URL"
  value      = "https://${cloudflare_workers_script.backend.subdomain}.workers.dev"
  environment = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "clerk_publishable_key" {
  project_id = vercel_project.frontend.id
  key        = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  value      = var.clerk_publishable_key
  environment = ["production", "preview", "development"]
}

resource "vercel_deployment" "frontend" {
  project_id  = vercel_project.frontend.id
  ref         = var.github_branch
  production  = true

  depends_on = [
    vercel_project_environment_variable.backend_url,
    vercel_project_environment_variable.clerk_publishable_key,
    vercel_project_domain.frontend_custom_domain,
  ]
}
