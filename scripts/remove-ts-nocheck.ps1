# C:\Projects\wageflow01\scripts\remove-ts-nocheck.ps1
# PowerShell 5.1 compatible.
# Removes standalone "@ts-nocheck" comment lines across the repo.
# Default is DRY_RUN. Use -Apply to write changes. Use -Backup to store originals under .backups\ts-nocheck\

[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Backup,

  [string]$RepoRoot = (Get-Location).Path,

  [string[]]$Roots = @("app", "components", "lib", "src"),

  [string]$BackupRootRelative = ".backups\ts-nocheck"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot([string]$Path) {
  try { return (Resolve-Path -LiteralPath $Path).Path } catch { throw "RepoRoot not found: $Path" }
}

function Get-NewLine([string]$Content) {
  if ($null -eq $Content) { return "`r`n" }
  if ($Content.Contains("`r`n")) { return "`r`n" }
  return "`n"
}

function Is-ExcludedPath([string]$FullName) {
  if ([string]::IsNullOrWhiteSpace($FullName)) { return $true }
  $p = $FullName -replace "/", "\"

  if ($p -match "\\node_modules\\") { return $true }
  if ($p -match "\\\.next\\") { return $true }
  if ($p -match "\\\.git\\") { return $true }
  if ($p -match "\\dist\\") { return $true }
  if ($p -match "\\out\\") { return $true }
  if ($p -match "\\coverage\\") { return $true }
  if ($p -match "\\build\\") { return $true }
  if ($p -match "\\\.turbo\\") { return $true }
  if ($p -match "\\\.vercel\\") { return $true }
  if ($p -match "\\\.cache\\") { return $true }
  if ($p -match "\\\.restore\\") { return $true }
  if ($p -match "\\\.local\\") { return $true }
  if ($p -match "\\\.backups\\") { return $true }
  if ($p -match "\\restore-original\.ps1$") { return $true }

  return $false
}

function Remove-TsNoCheckLines([string]$Content) {
  $nl = Get-NewLine $Content

  $lines = @()
  if ($null -ne $Content) {
    # Regex split keeps trailing empty line if file ends with newline.
    $lines = [regex]::Split($Content, "\r?\n")
  }

  $removed = 0
  $newLines = New-Object System.Collections.Generic.List[string]

  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($null -eq $line) { $line = "" }
    $t = $line.Trim()

    $isStandaloneBlock = ($t -match "^\s*/\*\s*@ts-nocheck\s*\*/\s*$")
    $isStandaloneLine  = ($t -match "^\s*//\s*@ts-nocheck\s*$")

    if ($isStandaloneBlock -or $isStandaloneLine) {
      $removed++
      continue
    }

    $newLines.Add($line)
  }

  while ($newLines.Count -gt 0) {
    $first = $newLines[0]
    if ($null -eq $first) { $first = "" }
    if ($first.Trim().Length -eq 0) {
      $newLines.RemoveAt(0) | Out-Null
      continue
    }
    break
  }

  $newContent = [string]::Join($nl, $newLines.ToArray())

  return [pscustomobject]@{
    Content      = $newContent
    RemovedCount = $removed
  }
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-RelativePath([string]$Base, [string]$Full) {
  $basePath = $Base.TrimEnd("\")
  $fullPath = $Full
  if ($fullPath.StartsWith($basePath, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $fullPath.Substring($basePath.Length)
    return $rel.TrimStart("\")
  }
  return $Full
}

$repo = Resolve-RepoRoot $RepoRoot
$mode = if ($Apply) { "APPLY" } else { "DRY_RUN" }

Write-Host ""
Write-Host ("RepoRoot: {0}" -f $repo)
Write-Host ("Mode: {0}" -f $mode)
Write-Host ("Backup: {0}" -f ([bool]$Backup))
Write-Host ""

$rootPaths = @()
foreach ($r in $Roots) {
  $p = Join-Path $repo $r
  if (Test-Path -LiteralPath $p) { $rootPaths += $p }
}

if (@($rootPaths).Count -eq 0) {
  throw "No roots found under RepoRoot. Roots: $($Roots -join ', ')"
}

$backupBase = $null
if ($Apply -and $Backup) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupBase = Join-Path $repo (Join-Path $BackupRootRelative $stamp)
  Ensure-Dir $backupBase
}

$files = @()
foreach ($rp in $rootPaths) {
  $files += Get-ChildItem -LiteralPath $rp -Recurse -File -Force -ErrorAction SilentlyContinue
}

$files =
  @($files | Where-Object {
    $fn = $_.FullName
    if (Is-ExcludedPath $fn) { return $false }

    $name = $_.Name.ToLowerInvariant()
    if ($name.EndsWith(".ts") -or $name.EndsWith(".tsx") -or $name.EndsWith(".js") -or $name.EndsWith(".jsx") -or $name.EndsWith(".mjs") -or $name.EndsWith(".cjs") -or $name.EndsWith(".d.ts")) {
      return $true
    }
    return $false
  })

$totalRemoved = 0
$changed = New-Object System.Collections.Generic.List[object]

foreach ($f in $files) {
  $path = $f.FullName

  $raw = [System.IO.File]::ReadAllText($path)

  if ($null -eq $raw -or ($raw -notmatch "@ts-nocheck")) { continue }

  $res = Remove-TsNoCheckLines $raw
  $removed = [int]$res.RemovedCount
  if ($removed -le 0) { continue }

  $totalRemoved += $removed
  $changed.Add([pscustomobject]@{ Path = $path; RemovedCount = $removed })

  if ($Apply) {
    if ($Backup -and $backupBase) {
      $rel = Get-RelativePath $repo $path
      $dest = Join-Path $backupBase $rel
      $destDir = Split-Path -Parent $dest
      Ensure-Dir $destDir
      [System.IO.File]::WriteAllText($dest, $raw)
    }

    [System.IO.File]::WriteAllText($path, $res.Content)
  }
}

$changedSorted =
  @($changed | Sort-Object -Property @(
    @{ Expression = "RemovedCount"; Descending = $true }
    @{ Expression = "Path"; Descending = $false }
  ))

Write-Host ("Files matched: {0}" -f @($changedSorted).Count)
Write-Host ("Total @ts-nocheck lines removed: {0}" -f $totalRemoved)
Write-Host ""

foreach ($c in $changedSorted) {
  Write-Host ("{0} ({1})" -f $c.Path, $c.RemovedCount)
}

if (-not $Apply) {
  Write-Host ""
  Write-Host "Dry run only. Nothing was changed."
  Write-Host "When you are ready, run again with -Apply. Add -Backup to save copies under .backups\ts-nocheck\"
} else {
  Write-Host ""
  Write-Host "Apply complete."
  if ($Backup -and $backupBase) {
    Write-Host ("Backups saved under: {0}" -f $backupBase)
  }
}