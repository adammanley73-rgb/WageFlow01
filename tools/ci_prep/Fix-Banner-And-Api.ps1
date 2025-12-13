param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Change {
  param([string]$File, [string]$What)
  "{0}`n  - {1}" -f $File, $What
}

"Scanning repository..."

# 1) Find app/*.tsx files that still use HeaderBanner or import it
$bannerHits = @(
  Select-String -Path "app/**/*.tsx" -Pattern "<HeaderBanner","@/components/ui/HeaderBanner" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

# 2) Find API routes using NextRequest
$apiHits = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

"HeaderBanner suspects: {0}" -f ($bannerHits.Count)
$bannerHits | ForEach-Object { "  - $_" }
"NextRequest suspects: {0}" -f ($apiHits.Count)
$apiHits   | ForEach-Object { "  - $_" }

if (-not $Apply) {
  "`nDry-run only. Re-run with -Apply to write changes."
  exit 0
}

# Utility: safe file write (UTF-8 no BOM)
function Set-FileContentUtf8 {
  param([string]$Path, [string]$Content)
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

# Regex patterns as here-strings to avoid quoting issues
$rxImportHeaderBanner = @'
(?m)^\s*import\s+HeaderBanner\s+from\s+["']@/components/ui/HeaderBanner["'];?\s*\r?\n
'@

$rxSelfClosingHeaderBanner = @'
<HeaderBanner\b[^>]*/>
'@

$rxImportNextReqResp = @'
(?m)^\s*import\s*\{\s*NextRequest\s*,\s*NextResponse\s*\}\s*from\s*["']next/server["']\s*;?\s*$
'@

$rxImportNextReqOnly = @'
(?m)^\s*import\s*\{\s*NextRequest\s*\}\s*from\s*["']next/server["']\s*;?\s*$
'@

$rxTypeAnnotationNextReq = @'
:\s*NextRequest
'@

$rxHasNextResponseImport = @'
(?m)^\s*import\s*\{\s*NextResponse\s*\}\s*from\s*["']next/server["']
'@

# 3) Fix HeaderBanner usage in app pages
foreach ($file in $bannerHits) {
  if ($file -like "*\components\*") { continue }  # don’t edit the component source

  $content = Get-Content -Raw -LiteralPath $file
  $orig = $content

  # Remove import HeaderBanner line
  $content = [regex]::Replace($content, $rxImportHeaderBanner, '')

  # Replace self-closing <HeaderBanner ... /> with a minimal header card, preserving title
  $content = [regex]::Replace(
    $content,
    $rxSelfClosingHeaderBanner,
    {
      param($m)
      $val = $m.Value
      $t = [regex]::Match($val, 'title\s*=\s*"([^"]+)"')
      if (-not $t.Success) { $t = [regex]::Match($val, "title\s*=\s*'([^']+)'" ) }
      $title = if ($t.Success) { $t.Groups[1].Value } else { 'Header' }

@"
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">$title</h1>
      </div>
"@
    }
  )

  if ($content -ne $orig) {
    Set-FileContentUtf8 -Path $file -Content $content
    Write-Change -File $file -What "Replaced HeaderBanner with minimal header card and removed import."
  }
}

# 4) Fix NextRequest in API routes
foreach ($file in $apiHits) {
  $content = Get-Content -Raw -LiteralPath $file
  $orig = $content

  # Replace combined import { NextRequest, NextResponse } with { NextResponse }
  $content = [regex]::Replace($content, $rxImportNextReqResp, 'import { NextResponse } from "next/server";')

  # Remove lone NextRequest import
  $content = [regex]::Replace($content, $rxImportNextReqOnly, '')

  # Replace type annotations : NextRequest -> : Request
  $content = [regex]::Replace($content, $rxTypeAnnotationNextReq, ': Request')

  # Ensure NextResponse import exists if used
  if ($content -match '\bNextResponse\b' -and -not [regex]::IsMatch($content, $rxHasNextResponseImport)) {
    $content = "import { NextResponse } from `"next/server`";`r`n" + $content
  }

  if ($content -ne $orig) {
    Set-FileContentUtf8 -Path $file -Content $content
    Write-Change -File $file -What "Replaced NextRequest with Request and normalised imports."
  }
}

"`nFormatting completed."

# 5) Verification scan
"Verifying no HeaderBanner usages remain in app/..."
$leftBanner = @(
  Select-String -Path "app/**/*.tsx" -Pattern "<HeaderBanner","@/components/ui/HeaderBanner" -SimpleMatch -ErrorAction SilentlyContinue
)
if ($leftBanner.Count -gt 0) {
  "Still found HeaderBanner references:"
  $leftBanner | ForEach-Object { "  - {0}:{1}" -f $_.Path, $_.LineNumber }
} else {
  "None found."
}

"Verifying no NextRequest usages remain in app/api/..."
$leftNextReq = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue
)
if ($leftNextReq.Count -gt 0) {
  "Still found NextRequest references:"
  $leftNextReq | ForEach-Object { "  - {0}:{1}" -f $_.Path, $_.LineNumber }
} else {
  "None found."
}

"`nRunning build..."
# Kill orphan Node processes and nuke .next to avoid Windows locks
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
attrib -R -S -H ".next" /S /D 2>$null
Remove-Item -Recurse -Force ".next" 2>$null

# Build
$env:NODE_ENV = "production"
npm run -s build
