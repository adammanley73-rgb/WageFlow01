# C:\Users\adamm\Projects\wageflow01\supabase\migrations\normalize_migrations.ps1
# Normalises local migration filenames and repairs remote history so Supabase CLI stops complaining.

$ErrorActionPreference = 'Stop'
$MRoot = 'C:\Users\adamm\Projects\wageflow01\supabase\migrations'

if (-not (Test-Path -LiteralPath $MRoot)) {
  throw "Migrations folder not found: $MRoot"
}

# 0) Move stray PowerShell scripts out of migrations
$ToolsDir = 'C:\Users\adamm\Projects\wageflow01\tools'
if (-not (Test-Path -LiteralPath $ToolsDir)) {
  New-Item -ItemType Directory -Path $ToolsDir | Out-Null
}
Get-ChildItem -LiteralPath $MRoot -Filter *.ps1 -File -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "Moving stray script out of migrations: $($_.Name)"
  Move-Item -LiteralPath $_.FullName -Destination (Join-Path $ToolsDir $_.Name) -Force
}

# 1) List of migration filenames remote expects (from CLI’s nagging)
$Required = @(
  '20250920190000_employees_fix_id.sql',
  '20250920190500_employees_fix_id_fk.sql',
  '20250920191500_employees_fix_fk_and_drop_employee_id.sql',
  '20250920192500_employees_rename_employee_id_legacy.sql',
  '20250920192600_employees_rename_employee_id_legacy_simple.sql',
  '20250930093000_scope_core_step1.sql',
  '20250930100500_backfill_company_id_step1.sql',
  '20250930101500_backfill_company_id_step1_fix.sql',
  '20250930104000_backfill_company_id_simple.sql',
  '20251006170000_company_members_fix.sql',
  '20251016_120000_multi_frequency_core.sql',
  '20251016_124500_fix_rls_policies.sql'
)

# 2) For each required base name, ensure a .sql exists.
#    If only .sql.skip or .sql.skip.bak exists, rename back to .sql.
foreach ($name in $Required) {
  $sql = Join-Path $MRoot $name
  $skip = "$sql.skip"
  $skipBak = "$sql.skip.bak"

  if (Test-Path -LiteralPath $sql) {
    Write-Host "OK: $name"
    continue
  }

  if (Test-Path -LiteralPath $skipBak) {
    Write-Host "Renaming $($name).skip.bak -> $name"
    Rename-Item -LiteralPath $skipBak -NewName $name -Force
    continue
  }

  if (Test-Path -LiteralPath $skip) {
    Write-Host "Renaming $($name).skip -> $name"
    Rename-Item -LiteralPath $skip -NewName $name -Force
    continue
  }

  # If nothing exists, create a harmless placeholder .sql (won’t be executed now)
  Write-Host "Creating placeholder: $name"
  @"
-- Placeholder to reconcile local vs remote migration history.
-- File: $name
-- Intentionally empty. Remote already has this recorded.
"@ | Set-Content -LiteralPath $sql -Encoding UTF8
}

Write-Host "`nLocal .sql files after normalisation:"
Get-ChildItem -LiteralPath $MRoot -Filter *.sql -File | Select-Object Name | Sort-Object Name | Format-Table -AutoSize

# 3) Run the repair commands the CLI suggested (mark these versions as applied in remote history)
# Some timestamps are repeated; run each line separately as advised.
Write-Host "`nRepairing remote migration history..."
Push-Location (Split-Path -Parent $MRoot)
try {
  supabase migration repair --status applied 20250920190000
  supabase migration repair --status applied 20250920190500
  supabase migration repair --status applied 20250920191500
  supabase migration repair --status applied 20250920192500
  supabase migration repair --status applied 20250920192600
  supabase migration repair --status applied 20250930093000
  supabase migration repair --status applied 20250930100500
  supabase migration repair --status applied 20250930101500
  supabase migration repair --status applied 20250930104000
  supabase migration repair --status applied 20251006170000
  supabase migration repair --status applied 20251016
  supabase migration repair --status applied 20251016
  supabase migration repair --status applied 20251016
  supabase migration repair --status applied 20251016
}
finally {
  Pop-Location
}

# 4) Pull a clean baseline from remote so local matches database state
Write-Host "`nRunning: supabase db pull"
Push-Location (Split-Path -Parent $MRoot)
try {
  supabase db pull
}
finally {
  Pop-Location
}

Write-Host "`nDone. If supabase still complains, run 'supabase db push' and paste the exact error."
