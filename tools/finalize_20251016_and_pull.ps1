# C:\Users\adamm\Projects\wageflow01\tools\finalize_20251016_and_pull.ps1
# Marks 20251016 as applied up to 5 times (handles multiple same-day rows), ignores duplicate key errors, then pulls schema.

$ErrorActionPreference = 'Stop'
$RepoRoot = 'C:\Users\adamm\Projects\wageflow01'
Set-Location $RepoRoot

# Ensure link is alive
supabase link --project-ref lvakedztsopqjfbjljkj | Out-Host

# Try to mark the stubborn same-day migrations as applied a few times
for ($i = 1; $i -le 5; $i++) {
  try {
    Write-Host ("[{0}/5] supabase migration repair --status applied 20251016" -f $i)
    supabase migration repair --status applied 20251016 | Out-Host
  } catch {
    # Duplicate key or already-applied is fine; continue
    Write-Host ("[{0}/5] note: {1}" -f $i, $_.Exception.Message)
  }
}

# Sanity: show remote vs local status
Write-Host "`nRemote migration list:"
supabase migration list | Out-Host

# Pull remote schema snapshot to local
Write-Host "`nPulling remote schema..."
supabase db pull | Out-Host

Write-Host "`nDone."
