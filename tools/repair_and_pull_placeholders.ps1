# C:\Users\adamm\Projects\wageflow01\tools\repair_and_pull_placeholders.ps1
# Creates placeholder .sql files for required timestamps, repairs migration history, and pulls schema.

$ErrorActionPreference = 'Stop'
$RepoRoot = 'C:\Users\adamm\Projects\wageflow01'
$MRoot    = Join-Path $RepoRoot 'supabase\migrations'

if (-not (Test-Path -LiteralPath $MRoot)) {
  New-Item -ItemType Directory -Path $MRoot | Out-Null
}

# Timestamps Supabase told you to mark as applied
$tstamps = @(
  '20250920190000',
  '20250920190500',
  '20250920191500',
  '20250920192500',
  '20250920192600',
  '20250930093000',
  '20250930100500',
  '20250930101500',
  '20250930104000',
  '20251006170000',
  '20251016','20251016','20251016','20251016'
)

# Ensure a file exists matching "<timestamp>_*.sql"
foreach ($ts in $tstamps) {
  $glob = Join-Path $MRoot ("{0}_*.sql" -f $ts)
  $exists = Get-ChildItem -LiteralPath $MRoot -Filter ("{0}_*.sql" -f $ts) -ErrorAction SilentlyContinue
  if (-not $exists) {
    $name = "{0}_remote_applied_placeholder.sql" -f $ts
    $path = Join-Path $MRoot $name
    @"
-- Placeholder created locally to match remote-applied migration.
-- Timestamp: $ts
-- Intentionally empty. Do not edit.
"@ | Set-Content -LiteralPath $path -Encoding UTF8
    Write-Host ("Created placeholder: {0}" -f $name)
  } else {
    Write-Host ("Found existing file(s) for {0}, leaving as-is." -f $ts)
  }
}

Write-Host "`nLinking to project (must already be linked)..."
Set-Location $RepoRoot
supabase link --project-ref lvakedztsopqjfbjljkj | Out-Host

Write-Host "`nMarking the listed migrations as applied in remote history..."
foreach ($ts in $tstamps) {
  Write-Host ("  supabase migration repair --status applied {0}" -f $ts)
  try {
    supabase migration repair --status applied $ts | Out-Host
  } catch {
    Write-Host ("    repair {0} failed: {1}" -f $ts, $_.Exception.Message)
  }
}

Write-Host "`nPulling remote schema to local..."
supabase db pull | Out-Host

Write-Host "`nDone. If you still see mismatch, run 'supabase db pull --debug' and share last 10 lines."
