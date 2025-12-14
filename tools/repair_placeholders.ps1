# Creates harmless placeholder .sql files for remote-applied migrations
# that you renamed to .skip/.bak locally. This satisfies Supabase CLI's
# "local files must match remote versions" check.

$Base = 'C:\Users\adamm\Projects\wageflow01\supabase\migrations'
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$targets = @(
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

if (-not (Test-Path -LiteralPath $Base)) {
  throw "Migrations folder not found: $Base"
}

foreach ($name in $targets) {
  $path = Join-Path $Base $name
  if (-not (Test-Path -LiteralPath $path)) {
    $content = @"
-- Placeholder to reconcile local vs remote migration history.
-- File: $name
-- Intentionally empty. Remote already applied the actual migration.
"@
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
    Write-Host "Created placeholder: $name"
  } else {
    Write-Host "Exists, skipping: $name"
  }
}

Write-Host "`nLocal migrations after repair:"
Get-ChildItem -LiteralPath $Base -Filter *.sql | Select-Object Name | Sort-Object Name | Format-Table -AutoSize
