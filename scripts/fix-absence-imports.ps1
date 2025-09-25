# scripts/fix-absence-imports.ps1
# Sweeps absence pages and fixes bad import specifiers.

param(
  [string[]]$Roots = @(".\app\dashboard\absence"),
  [string[]]$Patterns = @("*.tsx")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO

# Map of exact module specifiers to replace
$map = @{
  '^@/app/components/employees/EmployeePicker$' = '@/components/employees/EmployeePicker'
  '^@/lib/spbp$'                                = '@/lib/statutory/spbp'
  '^@/lib/smp$'                                 = '@/lib/statutory/smp'
  '^@/lib/spp$'                                 = '@/lib/statutory/spp'
  '^@/lib/awe$'                                 = '@/lib/statutory/awe'
  # Keep storeVersion as '@/lib/storeVersion' (ensure it exists)
}

function Fix-ImportsInContent([string]$text) {
  $updated = $text
  foreach ($kvp in $map.GetEnumerator()) {
    $from = $kvp.Key
    $to   = [regex]::Escape($kvp.Value)

    # Replace in both single and double quoted import specifiers
    $patternSingle = "(?<=from\s+')$from(?=')"
    $patternDouble = "(?<=from\s+"")$from(?="")"
    $updated = [regex]::Replace($updated, $patternSingle, $kvp.Value)
    $updated = [regex]::Replace($updated, $patternDouble, $kvp.Value)
  }
  return $updated
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$changed = 0
$scanned = 0

foreach ($root in $Roots) {
  foreach ($pat in $Patterns) {
    Get-ChildItem -Path $root -Recurse -Include $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
      $p = $_.FullName
      $scanned++
      $raw = [System.IO.File]::ReadAllText($p)
      $new = Fix-ImportsInContent $raw
      if ($new -ne $raw) {
        [System.IO.File]::WriteAllText($p, $new, $utf8NoBom)
        Write-Host "Fixed: $p"
        $changed++
      }
    }
  }
}

Write-Host "[fix-absence-imports] Scanned: $scanned file(s). Updated: $changed." -ForegroundColor Cyan
