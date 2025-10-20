# C:\Users\adamm\Projects\wageflow01\tools\repair_migrations_and_pull.ps1
# Cleans .skip/.bak artifacts, normalizes to .sql, repairs remote migration history, then runs supabase db pull.

$ErrorActionPreference = 'Stop'

$RepoRoot = 'C:\Users\adamm\Projects\wageflow01'
$MRoot    = Join-Path $RepoRoot 'supabase\migrations'

if (-not (Test-Path -LiteralPath $MRoot)) {
  throw "Migrations folder not found: $MRoot"
}

Write-Host "1) Cleaning stray script files from migrations..."
$ToolsDir = Join-Path $RepoRoot 'tools'
if (-not (Test-Path -LiteralPath $ToolsDir)) { New-Item -ItemType Directory -Path $ToolsDir | Out-Null }
Get-ChildItem -LiteralPath $MRoot -File -Include *.ps1 -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ("   Moving {0} -> tools" -f $_.Name)
  Move-Item -LiteralPath $_.FullName -Destination (Join-Path $ToolsDir $_.Name) -Force
}

Write-Host "2) Normalizing .sql.skip / .bak files..."
# For any file that matches <timestamp>_name.sql.skip(.bak), either delete (if a .sql already exists) or rename to .sql
Get-ChildItem -LiteralPath $MRoot -File -Include *.sql.skip, *.sql.skip.bak -ErrorAction SilentlyContinue | ForEach-Object {
  $base = $_.FullName -replace '\.skip(\.bak)?$',''
  $sql  = $base
  if (Test-Path -LiteralPath $sql) {
    Write-Host ("   Removing duplicate artifact: {0}" -f $_.Name)
    Remove-Item -LiteralPath $_.FullName -Force
  } else {
    Write-Host ("   Renaming {0} -> {1}" -f $_.Name, (Split-Path -Leaf $sql))
    Rename-Item -LiteralPath $_.FullName -NewName (Split-Path -Leaf $sql) -Force
  }
}

Write-Host "3) Current migrations after cleanup:"
Get-ChildItem -LiteralPath $MRoot -Filter *.sql -File | Select-Object Name | Sort-Object Name | Format-Table -AutoSize

Write-Host "4) Repair remote migration history (mark as applied to match remote)..."
Set-Location $RepoRoot
$repairs = @(
  '20250920190000','20250920190500','20250920191500','20250920192500','20250920192600',
  '20250930093000','20250930100500','20250930101500','20250930104000',
  '20251006170000',
  '20251016','20251016','20251016','20251016' # multiple entries exist remotely
)
foreach ($v in $repairs) {
  try {
    Write-Host ("   supabase migration repair --status applied {0}" -f $v)
    supabase migration repair --status applied $v | Out-Host
  } catch {
    Write-Host ("   repair {0}: {1}" -f $v, $_.Exception.Message)
  }
}

Write-Host "5) Pull remote schema to local..."
supabase db pull | Out-Host

Write-Host "`nDone."
