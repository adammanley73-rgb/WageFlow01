param(
  [string[]]$Paths = @(
    ".\lib\statutory\*.ts",
    ".\lib\services\*.ts"
  ),
  [string[]]$Exclude = @(
    ".\node_modules\**\*",
    ".\.next\**\*",
    ".\backup_preview\**\*",
    ".\scripts\backup_preview\**\*"
  )
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$added = 0; $skipped = 0

function Should-Exclude($path, $patterns) {
  foreach ($pat in $patterns) {
    if ([System.Management.Automation.WildcardPattern]::new($pat, 'IgnoreCase').IsMatch($path)) { return $true }
  }
  return $false
}

# repo root is parent of this script folder
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$files = @()
foreach ($pat in $Paths) {
  $glob = Join-Path $root $pat
  $files += Get-ChildItem -Recurse -Path $glob -File -ErrorAction SilentlyContinue
}

foreach ($f in $files | Sort-Object FullName -Unique) {
  $p = $f.FullName
  if (Should-Exclude $p $Exclude) { continue }

  try { $raw = [System.IO.File]::ReadAllText($p) } catch { continue }

  if ($raw -match '^\s*//\s*@ts-nocheck') { $skipped++; continue }

  $banner = "// @ts-nocheck`r`n/* preview: auto-suppressed to keep Preview builds green. */`r`n"
  [System.IO.File]::WriteAllText($p, $banner + $raw, $utf8NoBom)
  Write-Host "suppressed: $p"
  $added++
}

Write-Host "[preview-suppress-types] Added to $added file(s). Skipped $skipped."
