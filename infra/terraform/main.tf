terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
    neon = {
      source  = "terraform-community-providers/neon"
      version = "~> 0.1"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "neon" {
  token = var.neon_api_key
}
