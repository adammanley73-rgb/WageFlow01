#requires -version 5.1
param(
  [int]$Port = 3000,
  [int]$TimeoutSec = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Move to repo root
if ($PSScriptRoot) { Set-Location (Join-Path $PSScriptRoot "..") }

# Preview env
$env:BUILD_PROFILE = "preview"
$env:NODE_ENV = "production"
$env:NEXT_TELEMETRY_DISABLED = "1"

# Clean + build
if (Test-Path ".\.next") { Remove-Item -Recurse -Force ".\.next" }
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed with code $LASTEXITCODE" }

# Start production server in background on selected port with separate logs
$base = "http://localhost:$Port"
$logOut = Join-Path (Get-Location) "preview_server.out.log"
$logErr = Join-Path (Get-Location) "preview_server.err.log"
if (Test-Path $logOut) { Remove-Item -Force $logOut -ErrorAction SilentlyContinue }
if (Test-Path $logErr) { Remove-Item -Force $logErr -ErrorAction SilentlyContinue }

$server = Start-Process -FilePath "npx" -ArgumentList @("next","start","-p",$Port) -PassThru `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr

# Wait until /api/preview responds
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri ($base + "/api/preview") -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ready = $true; break }
  } catch { Start-Sleep -Milliseconds 750 }
}

if (-not $ready) {
  Write-Host "Server not ready at $base within timeout." -ForegroundColor Red
  if (Test-Path $logOut) {
    Write-Host "`n--- preview_server.out.log (tail) ---" -ForegroundColor DarkCyan
    Get-Content -LiteralPath $logOut -Tail 200 | Write-Host
  }
  if (Test-Path $logErr) {
    Write-Host "`n--- preview_server.err.log (tail) ---" -ForegroundColor DarkCyan
    Get-Content -LiteralPath $logErr -Tail 200 | Write-Host
  }
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  throw "Startup timeout"
}

# Run smoketest now that the server is up
if (Test-Path ".\scripts\preview-smoketest.ps1") {
  & .\scripts\preview-smoketest.ps1 -BaseUrl $base
  if ($LASTEXITCODE -ne 0) { throw "Smoketest failed." }
}

# Stop server
if ($server -and -not $server.HasExited) {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
Write-Host "`nPreview smoketest complete." -ForegroundColor Green
