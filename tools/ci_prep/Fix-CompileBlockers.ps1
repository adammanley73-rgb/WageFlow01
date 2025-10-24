param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Change {
  param([string]$File, [string]$What)
  "{0}`n  - {1}" -f $File, $What
}

# Utility: safe file write (UTF-8 no BOM)
function Set-FileContentUtf8 {
  param([string]$Path, [string]$Content)
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Replace-HeaderBanner {
  param([string]$content)

  # Remove ANY import that includes 'HeaderBanner' (default or named, any path)
  $rxImportHeaderBannerAny = @'
(?m)^\s*import[^\r\n;]*\bHeaderBanner\b[^\r\n;]*;?\s*$
'@
  $content = [regex]::Replace($content, $rxImportHeaderBannerAny, '')

  # Replace self-closing tags: <HeaderBanner ... />
  $rxSelfClosing = @'
<HeaderBanner\b[^>]*\/>
'@
  $content = [regex]::Replace(
    $content,
    $rxSelfClosing,
    {
      param($m)
      $val = $m.Value
      # Try several title syntaxes
      $title = $null
      $m1 = [regex]::Match($val, 'title\s*=\s*"([^"]+)"')
      if ($m1.Success) { $title = $m1.Groups[1].Value }
      if (-not $title) {
        $m2 = [regex]::Match($val, "title\s*=\s*'([^']+)'")
        if ($m2.Success) { $title = $m2.Groups[1].Value }
      }
      if (-not $title) {
        $m3 = [regex]::Match($val, 'title\s*=\s*\{\s*["'']([^"'']+)["'']\s*\}')
        if ($m3.Success) { $title = $m3.Groups[1].Value }
      }
      if (-not $title) { $title = 'Header' }

@"
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">$title</h1>
      </div>
"@
    }
  )

  # Replace wrapped tags: <HeaderBanner ...>...</HeaderBanner>
  $rxWrapped = @'
<HeaderBanner\b[^>]*>(.*?)<\/HeaderBanner>
'@
  $content = [regex]::Replace(
    $content,
    $rxWrapped,
    {
      param($m)
      $open = $m.Value
      $title = $null
      $m1 = [regex]::Match($open, 'title\s*=\s*"([^"]+)"')
      if ($m1.Success) { $title = $m1.Groups[1].Value }
      if (-not $title) {
        $m2 = [regex]::Match($open, "title\s*=\s*'([^']+)'")
        if ($m2.Success) { $title = $m2.Groups[1].Value }
      }
      if (-not $title) {
        $m3 = [regex]::Match($open, 'title\s*=\s*\{\s*["'']([^"'']+)["'']\s*\}')
        if ($m3.Success) { $title = $m3.Groups[1].Value }
      }
      if (-not $title) { $title = 'Header' }

@"
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">$title</h1>
      </div>
"@
    },
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  return $content
}

function Replace-NextRequest {
  param([string]$content)

  $rxImportNextReqResp = @'
(?m)^\s*import\s*\{\s*NextRequest\s*,\s*NextResponse\s*\}\s*from\s*["']next/server["']\s*;?\s*$
'@
  $rxImportNextReqOnly = @'
(?m)^\s*import\s*\{\s*NextRequest\s*\}\s*from\s*["']next/server["']\s*;?\s*$
'@
  $rxTypeNextReq = @'
:\s*NextRequest
'@
  $rxHasNextResponseImport = @'
(?m)^\s*import\s*\{\s*NextResponse\s*\}\s*from\s*["']next/server["']
'@

  $orig = $content
  $content = [regex]::Replace($content, $rxImportNextReqResp, 'import { NextResponse } from "next/server";')
  $content = [regex]::Replace($content, $rxImportNextReqOnly, '')
  $content = [regex]::Replace($content, $rxTypeNextReq, ': Request')

  if ($content -match '\bNextResponse\b' -and -not [regex]::IsMatch($content, $rxHasNextResponseImport)) {
    $content = "import { NextResponse } from `"next/server`";`r`n" + $content
  }

  return $content
}

"Scanning for problem files..."

# Find all app pages using HeaderBanner in any form
$bannerFiles = @(
  Select-String -Path "app/**/*.tsx" -Pattern "<HeaderBanner","@/components/ui/HeaderBanner" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique |
    Where-Object { $_ -notlike "*\components\*" }
)

# Find all API files using NextRequest
$apiFiles = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

"HeaderBanner files: $($bannerFiles.Count)"
$bannerFiles | ForEach-Object { "  - $_" }
"NextRequest files: $($apiFiles.Count)"
$apiFiles | ForEach-Object { "  - $_" }

if (-not $Apply) {
  "`nDry-run only. Re-run with -Apply to write changes and build."
  exit 0
}

# Apply fixes
foreach ($file in $bannerFiles) {
  $txt = Get-Content -Raw -LiteralPath $file
  $new = Replace-HeaderBanner -content $txt
  if ($new -ne $txt) {
    Set-FileContentUtf8 -Path $file -Content $new
    Write-Change -File $file -What "HeaderBanner removed and minimal header card injected."
  }
}

foreach ($file in $apiFiles) {
  $txt = Get-Content -Raw -LiteralPath $file
  $new = Replace-NextRequest -content $txt
  if ($new -ne $txt) {
    Set-FileContentUtf8 -Path $file -Content $new
    Write-Change -File $file -What "NextRequest purged; Request/NextResponse normalised."
  }
}

"`nVerification sweeps:"
$leftBanner = @(
  Select-String -Path "app/**/*.tsx" -Pattern "<HeaderBanner","@/components/ui/HeaderBanner" -SimpleMatch -ErrorAction SilentlyContinue
)
if ($leftBanner.Count -gt 0) {
  "  Still found HeaderBanner references:"
  $leftBanner | ForEach-Object { "    - {0}:{1}" -f $_.Path, $_.LineNumber }
} else { "  No HeaderBanner references remain in app/." }

$leftNextReq = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue
)
if ($leftNextReq.Count -gt 0) {
  "  Still found NextRequest references:"
  $leftNextReq | ForEach-Object { "    - {0}:{1}" -f $_.Path, $_.LineNumber }
} else { "  No NextRequest references remain in app/api/." }

"`nRebuilding clean..."
# Kill any dev servers and nuke .next to avoid Windows locks
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
attrib -R -S -H ".next" /S /D 2>$null
Remove-Item -Recurse -Force ".next" 2>$null

$env:NODE_ENV = "production"
npm run -s build
