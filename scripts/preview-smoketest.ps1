param(
  [string]$BaseUrl = "http://localhost:3000"
)

#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Hit {
  param([string]$Path)
  $url = "$BaseUrl$Path"
  Write-Host "GET $url" -ForegroundColor Cyan
  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    "{0} -> {1}" -f $Path, $res.StatusCode
  } catch {
    "{0} -> ERROR: {1}" -f $Path, $_.Exception.Message
  }
}

# Smoke test key preview endpoints and pages
$results = @()
$results += Hit "/dashboard/preview"
$results += Hit "/api/preview"
$results += Hit "/api/pay/runs"
$results += Hit "/api/settings/company"

"`nResults:"
$results | ForEach-Object { Write-Host $_ }

# Exit non-zero if any failed
if ($results -match "ERROR" -or $results -match " 500" -or $results -match " 404") {
  Write-Host "`nOne or more checks failed." -ForegroundColor Red
  exit 1
} else {
  Write-Host "`nAll checks passed." -ForegroundColor Green
  exit 0
}
