# scripts\fix-encoding.ps1
# Normalize source files to UTF-8 (no BOM). Avoid pipes that return System.Void.

param(
  [string[]]$Roots = @("."),
  [string[]]$Patterns = @("*.ts","*.tsx","*.js","*.jsx","*.json","*.css","*.md")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-FileEncoding {
  param([byte[]]$Bytes)

  if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) { return "utf8-bom" }
  if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) { return "utf16-le" }
  if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) { return "utf16-be" }
  try {
    $s = [System.Text.Encoding]::UTF8.GetString($Bytes)
    $round = [System.Text.Encoding]::UTF8.GetBytes($s)
    if ($round.Length -eq $Bytes.Length) { return "utf8" }
  } catch {}
  return "unknown"
}

$converted = 0
$skipped = 0

# build list of files explicitly, no piping from void
$files = @()
foreach ($root in $Roots) {
  foreach ($pattern in $Patterns) {
    $items = Get-ChildItem -Path $root -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue
    if ($items) { $files += $items }
  }
}

foreach ($f in $files) {
  $path = $f.FullName
  try {
    $bytes = [System.IO.File]::ReadAllBytes($path)
  } catch {
    Write-Host "Skip (unreadable): $path" -ForegroundColor Yellow
    $skipped++
    continue
  }

  $enc = Get-FileEncoding -Bytes $bytes
  switch ($enc) {
    "utf8"     { $skipped++; continue }
    "utf8-bom" {
      $text = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
      [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
      $converted++; continue
    }
    "utf16-le" {
      $text = [System.Text.Encoding]::Unicode.GetString($bytes)
      [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
      $converted++; continue
    }
    "utf16-be" {
      $text = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
      [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
      $converted++; continue
    }
    default {
      try {
        $ansi = [System.Text.Encoding]::Default
        $text = $ansi.GetString($bytes)
        [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
        $converted++
      } catch {
        Write-Host "Skip (unknown encoding): $path" -ForegroundColor Yellow
        $skipped++
      }
    }
  }
}

Write-Host "Converted: $converted file(s). Skipped: $skipped." -ForegroundColor Cyan
exit 0
