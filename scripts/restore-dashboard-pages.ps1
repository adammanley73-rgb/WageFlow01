<# restore-dashboard-pages.ps1
Restores app pages from the latest .bak produced by apply-dashboard-template.ps1
#>

param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

$targets = @(
  "app\dashboard\page.tsx",
  "app\dashboard\employees\page.tsx",
  "app\dashboard\payroll\page.tsx",
  "app\dashboard\absence\page.tsx",
  "app\dashboard\settings\page.tsx"
)

function Restore-FromBackup([string]$relPath) {
  $full = Join-Path $ProjectRoot $relPath

  # Back up current file too, just in case
  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $full "$full.restore-$stamp.bak" -Force
  }

  # Our earlier script named backups like: page.tsx.YYYYMMDD-HHMMSS.bak
  $pattern = "$full.*.bak"
  $backups = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

  if (-not $backups -or $backups.Count -eq 0) {
    Write-Warning "No backup found for $relPath"
    return
  }

  $latest = $backups[0]
  Copy-Item $latest.FullName $full -Force
  Write-Host "Restored $relPath from $($latest.Name)"
}

$targets | ForEach-Object { Restore-FromBackup $_ }

Write-Host "`nDone. Restart dev and hard-refresh your browser."
