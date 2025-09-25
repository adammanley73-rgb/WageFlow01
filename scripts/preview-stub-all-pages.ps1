# scripts\preview-stub-all-pages.ps1
# Apply *.preview.stub files listed in stub-manifest.txt, with safe Windows paths.

param(
  [string]$Root = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Insert-SuffixBeforeExtension {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Suffix
  )
  $dir  = Split-Path -Parent $Path
  $name = Split-Path -Leaf   $Path
  if ($name -notmatch '\.') { return (Join-Path $dir ($name + $Suffix)) }
  $lastDot = $name.LastIndexOf('.')
  $base = $name.Substring(0, $lastDot)
  $ext  = $name.Substring($lastDot)
  return (Join-Path $dir ($base + $Suffix + $ext))
}

$repoRoot = Resolve-Path -LiteralPath $Root
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$bkDir = Join-Path -Path $PSScriptRoot -ChildPath ("backup_preview\" + $timestamp)
if (-not (Test-Path -LiteralPath $bkDir)) {
  New-Item -ItemType Directory -Force -Path $bkDir | Out-Null
}

$manifestPath = Join-Path -Path $PSScriptRoot -ChildPath "stub-manifest.txt"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  Write-Host "No stub-manifest.txt found at $manifestPath. Nothing to do." -ForegroundColor Yellow
  exit 0
}

$lines = Get-Content -LiteralPath $manifestPath | Where-Object { $_ -and $_.Trim() -ne "" -and -not $_.Trim().StartsWith("#") }

$applied = 0
foreach ($rel in $lines) {
  $target = Join-Path -Path $repoRoot -ChildPath $rel
  $stub   = Insert-SuffixBeforeExtension -Path $target -Suffix ".preview.stub"

  if (-not (Test-Path -LiteralPath $stub)) {
    Write-Host "Stub not found for $rel -> expecting $stub. Skipping." -ForegroundColor Yellow
    continue
  }

  $backupTarget = Join-Path -Path $bkDir -ChildPath $rel
  $backupDirForFile = Split-Path -Parent $backupTarget
  if (-not (Test-Path -LiteralPath $backupDirForFile)) {
    New-Item -ItemType Directory -Force -Path $backupDirForFile | Out-Null
  }

  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination $backupTarget -Force
  }

  $targetDir = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  Copy-Item -LiteralPath $stub -Destination $target -Force
  $applied++
  Write-Host "Stub applied: $rel" -ForegroundColor Green
}

Write-Host "Preview stubs applied: $applied. Backups in $bkDir" -ForegroundColor Cyan
exit 0
