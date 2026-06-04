variable "cloudflare_api_token" {
  description = "Cloudflare API token (needs Workers Scripts:Edit + Workers Routes:Edit)"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (found in dashboard right sidebar)"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID (only needed for custom domain route)"
  type        = string
  default     = ""
}

variable "cloudflare_zone_name" {
  description = "Cloudflare zone name, e.g. example.com (only needed for custom domain route)"
  type        = string
  default     = ""
}

variable "cloudflare_backend_subdomain" {
  description = "Subdomain for the backend Worker (custom domain), e.g. api"
  type        = string
  default     = "api"
}

variable "supabase_access_token" {
  description = "Supabase access token (from https://supabase.com/dashboard/account/tokens)"
  type        = string
  sensitive   = true
}

variable "supabase_db_password" {
  description = "Password for the Supabase PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "supabase_region" {
  description = "Supabase project region"
  type        = string
  default     = "ap-southeast-1"
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (optional, leave empty for personal account)"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository in org/repo format"
  type        = string
}

variable "github_branch" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}

variable "clerk_secret_key" {
  description = "Clerk backend secret key"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk frontend publishable key"
  type        = string
  sensitive   = true
}

variable "clerk_webhook_secret" {
  description = "Clerk webhook signing secret"
  type        = string
  sensitive   = true
}

variable "ai_provider" {
  description = "AI provider: openrouter or google"
  type        = string
  default     = "openrouter"
}

variable "openrouter_api_key" {
  description = "OpenRouter API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openrouter_model" {
  description = "OpenRouter model name"
  type        = string
  default     = "google/gemini-2.0-flash-exp:free"
}

variable "google_api_key" {
  description = "Google AI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_model" {
  description = "Google AI model name"
  type        = string
  default     = "gemini-2.0-flash"
}
