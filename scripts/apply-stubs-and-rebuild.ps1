# scripts\apply-stubs-and-rebuild.ps1
# Rebuild with preview stubs, optionally start server, and basic smoketest.
# Uses npm.cmd to avoid the PowerShell npm.ps1 shim issue.

param(
  [switch]$StartServer = $false,
  [int]$Port = 3000,
  [int]$TimeoutSec = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-OptionalStubber {
  $stubber  = Join-Path $PSScriptRoot "preview-stub-all-pages.ps1"
  $manifest = Join-Path $PSScriptRoot "stub-manifest.txt"
  if ( (Test-Path -LiteralPath $stubber -PathType Leaf) -and (Test-Path -LiteralPath $manifest -PathType Leaf) ) {
    Write-Host "[stub] Applying preview stubs from manifest..." -ForegroundColor Cyan
    & $stubber -Root "."
  } else {
    Write-Host "[stub] Skipped. Either stubber or manifest missing." -ForegroundColor Yellow
  }
}

function Invoke-NpmCmd {
  param([string]$ArgsLine)
  $npm = "npm.cmd"
  $p = Start-Process -FilePath $npm -ArgumentList $ArgsLine -NoNewWindow -PassThru -Wait `
       -RedirectStandardOutput "$PWD\npm.out.log" -RedirectStandardError "$PWD\npm.err.log"
  if ($p.ExitCode -ne 0) {
    $stderr = Get-Content -Raw "$PWD\npm.err.log"
    throw "npm.cmd $ArgsLine failed with exit code $($p.ExitCode)`n$stderr"
  }
  Get-Content -Tail 200 "$PWD\npm.out.log" | ForEach-Object { Write-Host $_ }
}

function Wait-For-Http {
  param([string]$Url, [int]$Seconds)
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $Url
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch { Start-Sleep -Milliseconds 500 }
  } while ((Get-Date) -lt $deadline)
  return $false
}

# 1) Apply stubs if present
Invoke-OptionalStubber

# 2) Clean and build
Write-Host "[build] Installing deps (if needed)..." -ForegroundColor Cyan
Invoke-NpmCmd -ArgsLine "ci --no-audit --no-fund"

Write-Host "[build] Building Next app..." -ForegroundColor Cyan
Invoke-NpmCmd -ArgsLine "run build"

# 3) Start server optionally
if ($StartServer) {
  Write-Host "[serve] Starting Next server on port $Port ..." -ForegroundColor Cyan
  $outLog = Join-Path (Get-Location) "preview_server.out.log"
  $errLog = Join-Path (Get-Location) "preview_server.err.log"
  if (Test-Path $outLog) { Remove-Item $outLog -Force }
  if (Test-Path $errLog) { Remove-Item $errLog -Force }

  $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run start -- -p $Port" -NoNewWindow -PassThru `
            -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  $ok = Wait-For-Http -Url "http://localhost:$Port/api/preview" -Seconds $TimeoutSec
  if (-not $ok) {
    Write-Host "[smoketest] Timeout waiting for /api/preview. Check logs:" -ForegroundColor Red
    Write-Host "  $outLog"
    Write-Host "  $errLog"
    exit 1
  }
  Write-Host "[smoketest] /api/preview responded. Preview server looks alive." -ForegroundColor Green
}
