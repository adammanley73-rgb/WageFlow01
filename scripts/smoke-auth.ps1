# scripts/smoke-auth.ps1
# Start Next in production-like mode, then verify Basic Auth locally.
# Fix: readiness now probes a public static asset (favicon) instead of the homepage,
# so a 401 from auth doesn’t make the wait loop time out like a sulking browser.

param(
  [string]$AuthUser = "admin",
  [string]$AuthPass = "change-me-now",
  [int]$Port = 3000,
  [int]$ReadyTimeoutSec = 60
)

function Start-NextProd {
  Write-Host "[kill] node" -ForegroundColor Cyan
  taskkill /IM node.exe /F 2>$null | Out-Null

  Write-Host "[clean] .next" -ForegroundColor Cyan
  Remove-Item -Recurse -Force .next 2>$null

  $env:NODE_ENV   = "production"
  $env:VERCEL_ENV = "production"
  $env:AUTH_USER  = $AuthUser
  $env:AUTH_PASS  = $AuthPass
  $env:AUTH_REALM = "WageFlow"

  # Dummy Supabase to satisfy any import-time checks
  if (-not $env:NEXT_PUBLIC_SUPABASE_URL)      { $env:NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321" }
  if (-not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY) { $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "ey_dummy_anon_key_for_local_build_only" }

  Write-Host "[build] next build" -ForegroundColor Green
  npm.cmd run build | Write-Host
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }

  Write-Host "[start] next start" -ForegroundColor Green
  Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run","start" | Out-Null
}

function Wait-StaticOk([string]$BaseUrl, [int]$TimeoutSec) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $probes = @(
    "/favicon.ico",
    "/_next/static/chunks/main.js",
    "/_next/static/chunks/webpack.js"
  )
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    foreach ($p in $probes) {
      try {
        $u = "$BaseUrl$p"
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { return $true }
      } catch {
        # ignore until timeout
      }
    }
    Start-Sleep -Milliseconds 300
  }
  return $false
}

Start-NextProd

$base = "http://localhost:$Port"
if (-not (Wait-StaticOk $base $ReadyTimeoutSec)) {
  throw "Server did not expose static assets on $base within $ReadyTimeoutSec seconds."
}

Write-Host "`n[check] unauthenticated should be 401" -ForegroundColor Yellow
try {
  Invoke-WebRequest -Uri "$base" -UseBasicParsing -ErrorAction Stop | Out-Null
  Write-Host "Unexpected 200 without auth" -ForegroundColor Red
} catch {
  try {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $code" -ForegroundColor Cyan
  } catch {
    Write-Host "No HTTP response (connection error). Is the server running?" -ForegroundColor Red
    exit 1
  }
}

Write-Host "`n[check] authenticated should be 200" -ForegroundColor Yellow
$pair = "$AuthUser`:$AuthPass"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($pair)
$basic = [Convert]::ToBase64String($bytes)
$headers = @{ Authorization = "Basic $basic" }
$authCode = (Invoke-WebRequest -Uri "$base" -Headers $headers -UseBasicParsing -ErrorAction Stop).StatusCode
Write-Host "Status: $authCode" -ForegroundColor Cyan

Write-Host "`n[check] static should be 200 without auth" -ForegroundColor Yellow
$sc = Invoke-WebRequest -Uri "$base/favicon.ico" -UseBasicParsing -ErrorAction Stop
Write-Host "Status: $($sc.StatusCode)" -ForegroundColor Cyan

Write-Host "`nDone." -ForegroundColor Green
