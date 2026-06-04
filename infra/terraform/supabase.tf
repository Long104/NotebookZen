resource "supabase_project" "notebookzen" {
  name                 = "NotebookZen"
  database_password    = var.supabase_db_password
  region               = var.supabase_region
  plan                 = "free"
}

resource "supabase_settings" "general" {
  project_id = supabase_project.notebookzen.id
}
