<# scripts\collect-candidates-direct.ps1
Scan VS Code Local History + workspaceStorage + Next.js cache for page code
and copy any matches into recovery\candidates\<page>\
#>

param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

# Where we will copy candidates
$destRoot = Join-Path $ProjectRoot "recovery\candidates"
$pages = @("dashboard","employees","payroll","absence","settings")
foreach ($p in $pages) { New-Item -ItemType Directory -Force -Path (Join-Path $destRoot $p) | Out-Null }

# Search sources
$VsHistoryStable   = Join-Path $env:APPDATA "Code\User\History"
$VsWorkspaceStable = Join-Path $env:APPDATA "Code\User\workspaceStorage"
$VsHistoryInsiders   = Join-Path $env:APPDATA "Code - Insiders\User\History"
$VsWorkspaceInsiders = Join-Path $env:APPDATA "Code - Insiders\User\workspaceStorage"
$NextApp   = Join-Path $ProjectRoot ".next\server\app"
$NextStatic= Join-Path $ProjectRoot ".next\static"

$searchRoots = @(
  $VsHistoryStable, $VsWorkspaceStable,
  $VsHistoryInsiders, $VsWorkspaceInsiders,
  $NextApp, $NextStatic
) | Where-Object { $_ -and (Test-Path $_) }

if (-not $searchRoots) {
  Write-Warning "No search roots found. VS Code history and .next cache may be missing."
}

# Signature phrases per page
$patterns = @{
  "dashboard" = @("Employees","Payroll Runs","Pending Tasks","Notices","View Employees","Go to Payroll","View Tasks","View Notices","New Employee Wizard","Run Payroll","Record Absence")
  "employees" = @("Active employees","Onboarding","Leavers","Create employee","Directory")
  "payroll"   = @("Open runs","Approved","RTI submitted","Completed","New payroll run","View runs")
  "absence"   = @("Sickness","Parental","Annual leave","Other","New absence","Absence list")
  "settings"  = @("Configured items","Warnings","Company settings","Payroll settings")
}

function Copy-Candidate($srcPath, $page) {
  try {
    $destDir = Join-Path $destRoot $page
    $stamp = Get-Date (Get-Item $srcPath).LastWriteTime -Format "yyyyMMdd-HHmmss"
    $leaf = Split-Path $srcPath -Leaf
    $dest = Join-Path $destDir "$stamp-$leaf"
    Copy-Item $srcPath $dest -Force
  } catch {
    Write-Warning "Copy failed: $srcPath -> $dest : $_"
  }
}

foreach ($root in $searchRoots) {
  Write-Host "Scanning $root ..."
  # We scan only text-like files to keep it fast
  $files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
           Where-Object { $_.Length -lt 5MB -and $_.Extension -in ".tsx",".ts",".js",".jsx",".mjs",".txt",".bak",".json" }

  foreach ($page in $pages) {
    $regex = ($patterns[$page] -join "|")
    try {
      $hits = $files | Select-String -Pattern $regex -SimpleMatch -ErrorAction SilentlyContinue
      foreach ($h in $hits) {
        Copy-Candidate -srcPath $h.Path -page $page
      }
    } catch { }
  }
}

# Also sweep your repo itself for old .bak and temp files
Write-Host "Sweeping repo for .bak and temp copies..."
$repo = (Resolve-Path $ProjectRoot).Path
$bakHits = Get-ChildItem -Path $repo -Recurse -File -Include *.bak,*.tmp,*.old -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -match "page\.tsx" -or $_.DirectoryName -match "dashboard" }
foreach ($b in $bakHits) {
  # Guess the page from the path
  $lower = $b.FullName.ToLower()
  $page = switch -regex ($lower) {
    "dashboard\\employees" { "employees"; break }
    "dashboard\\payroll"   { "payroll"; break }
    "dashboard\\absence"   { "absence"; break }
    "dashboard\\settings"  { "settings"; break }
    default { "dashboard" }
  }
  Copy-Candidate -srcPath $b.FullName -page $page
}

Write-Host "`nDone. Check: $destRoot"
