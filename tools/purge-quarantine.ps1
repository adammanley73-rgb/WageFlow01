# tools/purge-quarantine.ps1
# Permanently deletes quarantined items under tools\quarantine\employees.
# Safe by default: dry run unless -DoIt is provided. Keeps newest snapshot by default.

param(
  [switch]$DoIt,
  [int]$KeepLatest = 1,     # how many newest snapshots to keep
  [switch]$ListOnly         # just list snapshots and exit
)

$ErrorActionPreference = 'Stop'

# 1) Resolve paths
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$quarantine  = Join-Path $projectRoot "tools\quarantine\employees"
$reportsDir  = Join-Path $projectRoot "tools\reports"

if (-not (Test-Path -LiteralPath $quarantine)) {
  Write-Host "No quarantine folder found at: $quarantine" -ForegroundColor Yellow
  exit 0
}

# 2) Collect snapshot folders (timestamped subfolders)
$snapshots = Get-ChildItem -LiteralPath $quarantine -Directory -ErrorAction SilentlyContinue |
  Sort-Object CreationTime -Descending

if (-not $snapshots -or $snapshots.Count -eq 0) {
  Write-Host "Quarantine exists but contains no snapshot folders." -ForegroundColor Yellow
  exit 0
}

# 3) List mode
if ($ListOnly) {
  Write-Host "Quarantine snapshots (newest first):" -ForegroundColor Cyan
  $snapshots | ForEach-Object {
    "{0:yyyy-MM-dd HH:mm:ss}  {1}" -f $_.CreationTime, $_.FullName
  }
  exit 0
}

# 4) Determine what to delete vs keep
if ($KeepLatest -lt 0) { $KeepLatest = 0 }
$toKeep    = @()
$toDelete  = @()

for ($i = 0; $i -lt $snapshots.Count; $i++) {
  if ($i -lt $KeepLatest) { $toKeep   += $snapshots[$i] }
  else                    { $toDelete += $snapshots[$i] }
}

# 5) Safety: ensure target path contains the expected segment
function Assert-UnderQuarantine([string]$path) {
  $norm = [IO.Path]::GetFullPath($path)
  if ($norm -notlike "*\tools\quarantine\employees*") {
    throw "Refusing to operate outside quarantine: $norm"
  }
}
$toDelete | ForEach-Object { Assert-UnderQuarantine $_.FullName }

# 6) Report file
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null
$report = Join-Path $reportsDir ("employees_quarantine_purge_{0}.txt" -f (Get-Date -Format "yyyyMMdd_HHmmss"))

"EMPLOYEES QUARANTINE PURGE" | Out-File -FilePath $report -Encoding UTF8
"Project root: $projectRoot" | Out-File -FilePath $report -Encoding UTF8 -Append
"Quarantine:   $quarantine"  | Out-File -FilePath $report -Encoding UTF8 -Append
""                           | Out-File -FilePath $report -Encoding UTF8 -Append
"KeepLatest: $KeepLatest"    | Out-File -FilePath $report -Encoding UTF8 -Append
""                           | Out-File -FilePath $report -Encoding UTF8 -Append

# 7) Perform or simulate delete
if ($toDelete.Count -eq 0) {
  "Nothing to delete. Snapshots kept: $($toKeep.Count)" | Out-File -FilePath $report -Encoding UTF8 -Append
  Write-Host "Nothing to delete. Kept $($toKeep.Count) snapshot(s)." -ForegroundColor Green
  Write-Host "Report: $report" -ForegroundColor Yellow
  exit 0
}

"Deleting $($toDelete.Count) snapshot(s):" | Out-File -FilePath $report -Encoding UTF8 -Append
$toDelete | ForEach-Object { "  $_" | Out-File -FilePath $report -Encoding UTF8 -Append }

if (-not $DoIt) {
  Write-Host "Dry run. Would delete $($toDelete.Count) snapshot(s). Use -DoIt to proceed." -ForegroundColor Yellow
  Write-Host "Report: $report" -ForegroundColor Yellow
  exit 0
}

foreach ($folder in $toDelete) {
  try {
    Remove-Item -LiteralPath $folder.FullName -Recurse -Force -ErrorAction Stop
    Write-Host "Deleted: $($folder.FullName)" -ForegroundColor Green
  } catch {
    $msg = "Failed: $($folder.FullName) -> $($_.Exception.Message)"
    Write-Host $msg -ForegroundColor Red
    $msg | Out-File -FilePath $report -Encoding UTF8 -Append
  }
}

"" | Out-File -FilePath $report -Encoding UTF8 -Append
"Kept snapshots:" | Out-File -FilePath $report -Encoding UTF8 -Append
$toKeep | ForEach-Object { "  $($_.FullName)" | Out-File -FilePath $report -Encoding UTF8 -Append }

Write-Host "Purge complete." -ForegroundColor Green
Write-Host "Report: $report" -ForegroundColor Yellow
