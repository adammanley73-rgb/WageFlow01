# C:\Users\adamm\Projects\wageflow01\tools\repair_reverted_and_pull.ps1
# Marks the listed remote migrations as REVERTED (per CLI hint), then pulls schema.

$ErrorActionPreference = 'Stop'
$RepoRoot = 'C:\Users\adamm\Projects\wageflow01'

Set-Location $RepoRoot

# Ensure linked
supabase link --project-ref lvakedztsopqjfbjljkj | Out-Host

# Timestamps the CLI told you to mark as REVERTED (exact list from the last output)
$reverted = @(
  '20250920090000',
  '20250920104000',
  '20250920120000',
  '20250920150000',
  '20250920170000',
  '20250920173000',
  '20250920173500',
  '20250920180500',
  '20250920192000',
  '20250920192700',
  '20250920193000',
  '20250920193500',
  '20250920194000',
  '20250920195000',
  '20250920201000',
  '20250920204500',
  '20250921094500',
  '20250922013000',
  '20250922020500',
  '20250922034500',
  '20250922035900',
  '20250922040000',
  '20250922061000',
  '20250922071500',
  '20250923091500',
  '20250923113000',
  '20250923131000',
  '20250923133500',
  '20250923135000',
  '20250923150000',
  '20250924090000',
  '20250924093000',
  '20250930090000',
  '20250930091500',
  '20250930093500',
  '20250930094000',
  '20250930094500',
  '20250930095500',
  '20250930105500',
  '20250930110000',
  '20250930112000',
  '20250930113000',
  '20250930114500',
  '20250930120000',
  '20250930123000',
  '20250930124000',
  '20250930125000',
  '20251001090000',
  '20251006172000',
  '20251016',
  '20251016020000',
  '20251016021033',
  '20251016021034',
  '20251016021035',
  '20251016021036'
)

Write-Host "Marking remote migrations as REVERTED..."
foreach ($ts in $reverted) {
  try {
    Write-Host ("  supabase migration repair --status reverted {0}" -f $ts)
    supabase migration repair --status reverted $ts | Out-Host
  } catch {
    Write-Host ("    revert {0} failed: {1}" -f $ts, $_.Exception.Message)
  }
}

Write-Host "`nNow pull the remote schema…"
supabase db pull | Out-Host

Write-Host "`nDone. If it still complains, run: supabase migration list  and paste the output."
