# tools/fix-employees-tree.ps1
# Safely quarantines unexpected items under app/dashboard/employees
# and ensures the canonical tree exists. No overwrites.

param(
  [switch]$DryRun  # if set, only prints actions
)

$ErrorActionPreference = 'Stop'

# 1) Roots
$employeesRoot = "C:\Users\adamm\Projects\wageflow01\app\dashboard\employees"
if (-not (Test-Path -LiteralPath $employeesRoot)) {
  Write-Host "Folder not found: $employeesRoot" -ForegroundColor Red
  exit 1
}

# project root = three levels up from employees (employees -> dashboard -> app -> wageflow01)
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $employeesRoot "..\..\.."))
$reportsDir  = Join-Path $projectRoot "tools\reports"
$quarantine  = Join-Path $projectRoot ("tools\quarantine\employees\" + (Get-Date -Format "yyyyMMdd_HHmmss"))

# 2) Whitelist
$allowed = @(
  # top-level
  "page.tsx",
  "directory",
  "directory\page.tsx",
  "import",
  "import\page.tsx",
  "new",
  "new\page.tsx",
  "new\EmploymentFields.tsx",
  "new\P45NewStarter.tsx",
  "new\PayBlock.tsx",
  "new\sharedFields.tsx",
  "tax-codes",
  "tax-codes\page.tsx",
  "[id]",
  "[id]\page.tsx",   # optional details page
  "[id]\edit",
  "[id]\edit\page.tsx",
  "[id]\payroll",
  "[id]\payroll\page.tsx"
)

# Helpers
function Get-RelPath([string]$full, [string]$root) {
  $normRoot = $root.TrimEnd('\') + '\'
  if ($full.StartsWith($normRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($normRoot.Length)
  }
  return $full
}

# 3) Scan actual file system
$allFiles   = Get-ChildItem -LiteralPath $employeesRoot -Recurse -File
$allFolders = Get-ChildItem -LiteralPath $employeesRoot -Recurse -Directory

$relFiles   = $allFiles   | ForEach-Object { Get-RelPath $_.FullName $employeesRoot }
$relFolders = $allFolders | ForEach-Object { Get-RelPath $_.FullName $employeesRoot }

$allowedSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$allowed, [System.StringComparer]::OrdinalIgnoreCase)

# 4) Work out anomalies
$unexpectedFiles   = @()
$unexpectedFolders = @()

foreach ($f in $relFiles)   { if (-not $allowedSet.Contains($f)) { $unexpectedFiles   += $f } }
foreach ($d in $relFolders) { if (-not $allowedSet.Contains($d)) { $unexpectedFolders += $d } }

# Skip moving any unexpected folder that contains an allowed descendant (safety)
$unexpectedFoldersSafe = @()
foreach ($d in $unexpectedFolders) {
  $full = Join-Path $employeesRoot $d
  $hasAllowedDescendant = $false
  foreach ($a in $allowed) {
    if ($a.Contains('\') -and (Join-Path $employeesRoot $a).StartsWith(($full.TrimEnd('\') + '\'), [System.StringComparison]::OrdinalIgnoreCase)) {
      $hasAllowedDescendant = $true
      break
    }
  }
  if (-not $hasAllowedDescendant) { $unexpectedFoldersSafe += $d }
}

# 5) Ensure canonical skeleton exists (no overwrite)
$ensureDirs = @(
  "new",
  "[id]",
  "[id]\edit"
)

foreach ($d in $ensureDirs) {
  $full = Join-Path $employeesRoot $d
  if (-not (Test-Path -LiteralPath $full)) {
    if ($DryRun) { Write-Host "[DryRun] mkdir $full" -ForegroundColor Cyan }
    else { New-Item -ItemType Directory -Force -Path $full | Out-Null }
  }
}

# 6) Quarantine anomalies
if ($unexpectedFiles.Count -eq 0 -and $unexpectedFoldersSafe.Count -eq 0) {
  Write-Host "No anomalies found. Nothing to quarantine." -ForegroundColor Green
} else {
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path $quarantine | Out-Null
  }

  foreach ($f in $unexpectedFiles) {
    $src = Join-Path $employeesRoot $f
    $dst = Join-Path $quarantine $f
    $dstDir = Split-Path $dst -Parent
    if ($DryRun) {
      Write-Host "[DryRun] Move-Item `"$src`" -> `"$dst`"" -ForegroundColor Yellow
    } else {
      New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
      Move-Item -LiteralPath $src -Destination $dst -Force
    }
  }

  foreach ($d in $unexpectedFoldersSafe | Sort-Object -Descending) {
    $src = Join-Path $employeesRoot $d
    $dst = Join-Path $quarantine $d
    $dstDir = Split-Path $dst -Parent
    if ($DryRun) {
      Write-Host "[DryRun] Move-Item `"$src`" -> `"$dst`"" -ForegroundColor Yellow
    } else {
      New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
      Move-Item -LiteralPath $src -Destination $dst -Force
    }
  }
}

# 7) Report
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null
$reportFile = Join-Path $reportsDir "employees_tree_fix_$(Get-Date -Format yyyyMMdd_HHmmss).txt"

"FIX REPORT" | Out-File -FilePath $reportFile -Encoding UTF8
"Project root: $projectRoot" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
"Employees root: $employeesRoot" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
"" | Out-File -FilePath $reportFile -Encoding UTF8 -Append

"Unexpected files: $($unexpectedFiles.Count)" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
$unexpectedFiles | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }
"Unexpected folders (moved): $($unexpectedFoldersSafe.Count)" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
$unexpectedFoldersSafe | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }

Write-Host "Done." -ForegroundColor Green
Write-Host "Report: $reportFile" -ForegroundColor Yellow
if ($unexpectedFiles.Count -gt 0 -or $unexpectedFoldersSafe.Count -gt 0) {
  Write-Host "Quarantine: $quarantine" -ForegroundColor Yellow
}
