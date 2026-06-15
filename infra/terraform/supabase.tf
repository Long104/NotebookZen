resource "supabase_project" "notebookzen" {
  organization_id  = var.supabase_organization_id
  name             = "NotebookZen"
  database_password = var.supabase_db_password
  region           = var.supabase_region

}

resource "supabase_settings" "general" {
  project_ref = supabase_project.notebookzen.id
}
