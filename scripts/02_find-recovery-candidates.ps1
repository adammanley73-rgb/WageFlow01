# scripts\02_find-recovery-candidates.ps1
param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

# Where VS Code stores Local History (stable channel)
$VsHistory = Join-Path $env:APPDATA "Code\User\History"
$VsHistoryInsiders = Join-Path $env:APPDATA "Code - Insiders\User\History"
$NextCache = Join-Path $ProjectRoot ".next"

$patterns = @{
  "dashboard" = @("Dashboard", "View Employees", "Go to Payroll", "View Tasks", "View Notices")
  "employees" = @("Active employees", "Onboarding", "Leavers", "Create employee", "Directory")
  "payroll"   = @("Open runs", "Approved", "RTI submitted", "Completed", "New payroll run", "View runs")
  "absence"   = @("Sickness", "Parental", "Annual leave", "Absence list", "New absence")
  "settings"  = @("Configured items", "Warnings", "Company settings", "Payroll settings")
}

$destRoot = Join-Path $ProjectRoot "recovery\candidates"
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

function Copy-Candidate($src, $page) {
  $name = Split-Path $src -Leaf
  $destDir = Join-Path $destRoot $page
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  $stamp = Get-Date (Get-Item $src).LastWriteTime -Format "yyyyMMdd-HHmmss"
  $dest = Join-Path $destDir "$stamp-$name"
  Copy-Item $src $dest -Force
}

function Search-Path($base, $page, $terms) {
  if (-not (Test-Path $base)) { return }
  $files = Get-ChildItem -Path $base -Recurse -File -ErrorAction SilentlyContinue |
           Where-Object { $_.Length -lt 5MB -and $_.Extension -in ".tsx",".ts",".js",".jsx",".mjs",".txt",".bak" }

  foreach ($term in $terms) {
    try {
      $hits = $files | Select-String -Pattern [regex]::Escape($term) -SimpleMatch -ErrorAction SilentlyContinue
      foreach ($hit in $hits) {
        Copy-Candidate -src $hit.Path -page $page
      }
    } catch { }
  }
}

Write-Host "Scanning VS Code History..."
Search-Path $VsHistory "employees" $patterns.employees
Search-Path $VsHistory "payroll"   $patterns.payroll
Search-Path $VsHistory "absence"   $patterns.absence
Search-Path $VsHistory "settings"  $patterns.settings
Search-Path $VsHistory "dashboard" $patterns.dashboard

Write-Host "Scanning VS Code Insiders History..."
Search-Path $VsHistoryInsiders "employees" $patterns.employees
Search-Path $VsHistoryInsiders "payroll"   $patterns.payroll
Search-Path $VsHistoryInsiders "absence"   $patterns.absence
Search-Path $VsHistoryInsiders "settings"  $patterns.settings
Search-Path $VsHistoryInsiders "dashboard" $patterns.dashboard

Write-Host "Scanning Next cache..."
$nextTargets = @(
  (Join-Path $NextCache "server\app"),
  (Join-Path $NextCache "static")
) | Where-Object { Test-Path $_ }

foreach ($p in $patterns.Keys) {
  foreach ($root in $nextTargets) {
    Search-Path $root $p $patterns[$p]
  }
}

Write-Host "`nCandidates copied under .\recovery\candidates\<page>\"
Write-Host "Open those folders and preview files to find your originals."
