param(
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-File([string]$p) {
  if (Test-Path -LiteralPath $p) { Get-Content -Raw -LiteralPath $p } else { "" }
}

# Collect TSX pages that mention HeaderBanner or import it
$headerBannerUsages = @(
  Select-String -Path "app/**/*.tsx" -Pattern "<HeaderBanner","@/components/ui/HeaderBanner" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

# For each file, classify whether it:
#  - uses HeaderBanner and is missing navChips prop (problem)
#  - uses HeaderBanner and includes navChips prop (not our problem today)
#  - only imports HeaderBanner but doesn’t render it (still suspicious)
$results = New-Object System.Collections.Generic.List[object]

foreach ($file in $headerBannerUsages) {
  $txt = Read-File $file
  if ([string]::IsNullOrWhiteSpace($txt)) { continue }

  $hasImport = $txt -match '@/components/ui/HeaderBanner'
  $hasTag    = $txt -match '<HeaderBanner\b'
  $hasNav    = $false

  if ($hasTag) {
    # Look for any HeaderBanner tag and check if navChips= is present in that tag
    $matches = [regex]::Matches($txt, '<HeaderBanner\b[^>]*>', 'IgnoreCase')
    foreach ($m in $matches) {
      if ($m.Value -match '\bnavChips\s*=') { $hasNav = $true; break }
    }
  }

  $status = if ($hasTag -and -not $hasNav) { "MissingNavChips" }
            elseif ($hasTag -and $hasNav)  { "HasNavChips" }
            elseif ($hasImport)            { "ImportOnly" }
            else                           { "Unknown" }

  $results.Add([pscustomobject]@{
    Path   = $file
    Status = $status
  })
}

# Collect API files that still use NextRequest
$apiNextReqFiles = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

# Build final report
$report = [pscustomobject]@{
  HeaderBanner = @{
    MissingNavChips = @($results | Where-Object { $_.Status -eq "MissingNavChips" } | Select-Object -ExpandProperty Path)
    HasNavChips     = @($results | Where-Object { $_.Status -eq "HasNavChips" }     | Select-Object -ExpandProperty Path)
    ImportOnly      = @($results | Where-Object { $_.Status -eq "ImportOnly" }      | Select-Object -ExpandProperty Path)
  }
  ApiNextRequest = @($apiNextReqFiles)
}

if ($Json) {
  $report | ConvertTo-Json -Depth 6
  exit 0
}

# Human-readable output
"HeaderBanner: Missing navChips"
if ($report.HeaderBanner.MissingNavChips.Count -gt 0) {
  $report.HeaderBanner.MissingNavChips | ForEach-Object { "  - $_" }
} else { "  - none" }

"`nHeaderBanner: Import-only (no render tag found)"
if ($report.HeaderBanner.ImportOnly.Count -gt 0) {
  $report.HeaderBanner.ImportOnly | ForEach-Object { "  - $_" }
} else { "  - none" }

"`nHeaderBanner: Has navChips (not blocking CI today)"
if ($report.HeaderBanner.HasNavChips.Count -gt 0) {
  $report.HeaderBanner.HasNavChips | ForEach-Object { "  - $_" }
} else { "  - none" }

"`nAPI: NextRequest usages"
if ($report.ApiNextRequest.Count -gt 0) {
  $report.ApiNextRequest | ForEach-Object { "  - $_" }
} else { "  - none" }
