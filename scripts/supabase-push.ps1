# scripts/supabase-push.ps1
# Purpose: Check and push Supabase migrations non-interactively on Windows.
# Usage:
#   scripts\supabase-push.ps1            # check then prompt you to apply
#   scripts\supabase-push.ps1 -AutoYes   # check then auto-apply

param(
  [switch]$AutoYes
)

$ErrorActionPreference = 'Stop'

function Run([string]$cmd) {
  # Run through cmd.exe so piping 'echo y|' works like it should on Windows
  & $env:ComSpec /c $cmd 2>&1
}

Write-Host "==> Supabase CLI version"
Run "supabase --version"

Write-Host "`n==> Checking pending migrations..."
# We send 'n' to avoid applying; we just want Supabase to list what it would push.
# Supabase prints its interactive prompt to stderr; we already capture 2>&1 above.
$preset = Run "echo n | supabase db push"

# Show the raw output for visibility
$preset | ForEach-Object { Write-Host $_ }

# Detect whether Supabase is listing migrations to push
$hasPending = $false
foreach ($line in $preset) {
  if ($line -match "Do you want to push these migrations\?") { $hasPending = $true; break }
}

if (-not $hasPending) {
  Write-Host "`n==> No pending migrations."
  exit 0
}

if (-not $AutoYes) {
  Write-Host "`n==> Pending migrations detected. Apply now? [Y/N]"
  $resp = Read-Host
  if ($resp -notin @('y','Y')) {
    Write-Host "Aborted."
    exit 0
  }
}

Write-Host "`n==> Applying migrations..."
# Now actually apply them by piping 'y'
$apply = Run "echo y | supabase db push"

$apply | ForEach-Object { Write-Host $_ }

# Best-effort success check
$failed = $false
foreach ($line in $apply) {
  if ($line -match "ERROR:|failed|Fatal|permission denied") { $failed = $true; break }
}

if ($failed) {
  Write-Host "`n==> Migration push reported errors. Review the output above."
  exit 1
}

Write-Host "`n==> Migrations applied."
exit 0
