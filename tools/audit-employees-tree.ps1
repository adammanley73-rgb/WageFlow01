# tools/audit-employees-tree.ps1
# Audits the employees folder against a strict whitelist.
# Outputs a report listing: missing-required, unexpected-files, unexpected-folders.

$ErrorActionPreference = 'Stop'

# 1) Root to audit
$root = "C:\Users\adamm\Projects\wageflow01\app\dashboard\employees"

if (-not (Test-Path -LiteralPath $root)) {
  Write-Host "Folder not found: $root" -ForegroundColor Red
  exit 1
}

# 2) Whitelist of relative paths that are allowed under employees
#    Include files and folders you actually use.
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
  "[id]\page.tsx",           # optional, keep if you use a details page
  "[id]\edit",
  "[id]\edit\page.tsx",
  "[id]\payroll",
  "[id]\payroll\page.tsx"
)

# 3) Gather actual items
# Helper to get a relative path from $root
function Get-RelPath([string]$full) {
  $normRoot = $root.TrimEnd('\') + '\'
  if ($full.StartsWith($normRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($normRoot.Length)
  }
  return $full
}

$allFiles   = Get-ChildItem -LiteralPath $root -Recurse -File
$allFolders = Get-ChildItem -LiteralPath $root -Recurse -Directory

$relFiles   = $allFiles   | ForEach-Object { Get-RelPath $_.FullName }
$relFolders = $allFolders | ForEach-Object { Get-RelPath $_.FullName }

# 4) Compute unexpected items
$allowedSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$allowed, [System.StringComparer]::OrdinalIgnoreCase)

$unexpectedFiles = @()
foreach ($f in $relFiles) {
  if (-not $allowedSet.Contains($f)) { $unexpectedFiles += $f }
}

$unexpectedFolders = @()
foreach ($d in $relFolders) {
  if (-not $allowedSet.Contains($d)) { $unexpectedFolders += $d }
}

# 5) Compute missing required items (from $allowed that are files or folders we expect to exist)
# Treat anything with an extension as a file we expect to exist
$missing = @()
foreach ($p in $allowed) {
  if ($p -match '\.[a-zA-Z0-9]+$') {
    $full = Join-Path $root $p
    if (-not (Test-Path -LiteralPath $full)) { $missing += $p }
  } else {
    # folder
    $full = Join-Path $root $p
    if (-not (Test-Path -LiteralPath $full)) { $missing += $p }
  }
}

# 6) Heuristics for common mistakes
$commonIssues = @()
# Folders like employees[id] at this level are outside $root, but catch variant names inside it
$patternWeird = '^\[+id\]+$'  # things like [[id]] or [id] typed oddly
$relFolders | Where-Object { $_ -match $patternWeird -and $_ -ne '[id]' } | ForEach-Object { $commonIssues += "Suspicious dynamic folder: $_" }

# 7) Write report
$reportDir = Join-Path $root "..\..\..\..\tools\reports"
$reportDir = [System.IO.Path]::GetFullPath($reportDir)
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$reportFile = Join-Path $reportDir "employees_tree_report.txt"

"EMPLOYEES TREE AUDIT" | Out-File -FilePath $reportFile -Encoding UTF8
"Root: $root"          | Out-File -FilePath $reportFile -Encoding UTF8 -Append
""                     | Out-File -FilePath $reportFile -Encoding UTF8 -Append

"Missing required (files or folders):" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
if ($missing.Count -eq 0) { "  None" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }
else { $missing | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append } }

"" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
"Unexpected files:" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
if ($unexpectedFiles.Count -eq 0) { "  None" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }
else { $unexpectedFiles | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append } }

"" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
"Unexpected folders:" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
if ($unexpectedFolders.Count -eq 0) { "  None" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }
else { $unexpectedFolders | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append } }

"" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
"Common issues detected:" | Out-File -FilePath $reportFile -Encoding UTF8 -Append
if ($commonIssues.Count -eq 0) { "  None" | Out-File -FilePath $reportFile -Encoding UTF8 -Append }
else { $commonIssues | ForEach-Object { "  $_" | Out-File -FilePath $reportFile -Encoding UTF8 -Append } }

# Console summary
Write-Host ""
Write-Host "Audit complete." -ForegroundColor Green
Write-Host "Report saved to: $reportFile" -ForegroundColor Yellow
Write-Host ""

# 8) Also print a quick on-screen summary
Write-Host "Missing required: $($missing.Count)"
Write-Host "Unexpected files: $($unexpectedFiles.Count)"
Write-Host "Unexpected folders: $($unexpectedFolders.Count)"
if ($commonIssues.Count -gt 0) {
  Write-Host "Common issues:" -ForegroundColor Cyan
  $commonIssues | ForEach-Object { Write-Host "  $_" }
}
