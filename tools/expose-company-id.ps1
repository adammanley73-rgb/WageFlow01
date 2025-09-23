# tools/expose-company-id.ps1
# Adds NEXT_PUBLIC_COMPANY_ID to .env.local using COMPANY_ID's value.
# Creates a timestamped backup first. Idempotent.

$ErrorActionPreference = 'Stop'

$envPath = "C:\Users\adamm\Projects\wageflow01\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Host ".env.local not found at $envPath" -ForegroundColor Red
  exit 1
}

$raw = Get-Content -LiteralPath $envPath -Encoding UTF8

# Extract COMPANY_ID
$companyLine = $raw | Where-Object { $_ -match '^\s*COMPANY_ID\s*=' } | Select-Object -First 1
if (-not $companyLine) {
  Write-Host "COMPANY_ID not set in .env.local" -ForegroundColor Red
  exit 1
}
$companyId = ($companyLine -split '=',2)[1].Trim()

# If NEXT_PUBLIC_COMPANY_ID already present, exit cleanly
$hasPublic = $raw | Where-Object { $_ -match '^\s*NEXT_PUBLIC_COMPANY_ID\s*=' } | Select-Object -First 1
if ($hasPublic) {
  Write-Host "NEXT_PUBLIC_COMPANY_ID already present. Nothing to do." -ForegroundColor Green
  exit 0
}

# Backup
$backup = "$envPath.bak.$([DateTime]::Now.ToString('yyyyMMdd_HHmmss'))"
Copy-Item -LiteralPath $envPath -Destination $backup -Force
Write-Host "Backup created: $backup" -ForegroundColor Yellow

# Append the public var
"`nNEXT_PUBLIC_COMPANY_ID=$companyId" | Out-File -FilePath $envPath -Encoding UTF8 -Append
Write-Host "Added NEXT_PUBLIC_COMPANY_ID to .env.local" -ForegroundColor Green
