# scripts\03_promote-candidate.ps1
param(
  [Parameter(Mandatory=$true)][string]$CandidatePath,
  [Parameter(Mandatory=$true)][ValidateSet("dashboard","employees","payroll","absence","settings")] [string]$Page
)

$ErrorActionPreference = "Stop"

$map = @{
  "dashboard" = "app\dashboard\page.tsx"
  "employees" = "app\dashboard\employees\page.tsx"
  "payroll"   = "app\dashboard\payroll\page.tsx"
  "absence"   = "app\dashboard\absence\page.tsx"
  "settings"  = "app\dashboard\settings\page.tsx"
}

$target = $map[$Page]
if (-not (Test-Path $CandidatePath)) { throw "Candidate not found: $CandidatePath" }
if (-not (Test-Path (Split-Path $target -Parent))) { New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null }

# Backup current target
if (Test-Path $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $target "$target.backup-$stamp" -Force
}

# If candidate is a .js/.mjs from .next, we still write it into .tsx so you can tweak it.
$content = Get-Content -Raw $CandidatePath

# Normalize line endings, write as UTF8
Set-Content -Path $target -Value $content -Encoding UTF8

Write-Host "Promoted candidate to $target"
