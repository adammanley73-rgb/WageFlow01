param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Change {
  param([string]$File, [string]$What)
  "{0}`n  - {1}" -f $File, $What
}

# UTF-8 (no BOM) safe write
function Set-FileContentUtf8 {
  param([string]$Path, [string]$Content)
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

"Scanning…"

# 1) Any API files mentioning NextRequest
$apiFiles = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

# 2) TSX files with inline style objects likely causing union type errors
# We look for common patterns: const S = { … }; or const styles = { … };
$styleFiles = @(
  Select-String -Path "app/**/*.tsx" -Pattern "const\s+S\s*=\s*\{","const\s+styles\s*=\s*\{" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)

"API NextRequest files: $($apiFiles.Count)"
$apiFiles | ForEach-Object { "  - $_" }
"Style object candidates: $($styleFiles.Count)"
$styleFiles | ForEach-Object { "  - $_" }

if (-not $Apply) {
  "`nDry-run only. Re-run with -Apply to write changes and build."
  exit 0
}

# --- Fixers ---

function Fix-Api-NextRequest {
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

  $new = $content
  $new = [regex]::Replace($new, $rxImportNextReqResp, 'import { NextResponse } from "next/server";')
  $new = [regex]::Replace($new, $rxImportNextReqOnly, '')
  $new = [regex]::Replace($new, $rxTypeNextReq, ': Request')
  # Belt-and-braces: remove any stray literal "NextRequest"
  $new = $new -replace 'NextRequest','Request'

  if ($new -match '\bNextResponse\b' -and -not [regex]::IsMatch($new, $rxHasNextResponseImport)) {
    $new = "import { NextResponse } from `"next/server`";`r`n" + $new
  }

  return $new
}

function Fix-AddConstAssertionToStyleBlock {
  param([string]$content)

  # Add "as const" to common style blocks so values like 'wrap' remain string literals
  # Matches: const S = { … };
  $rxConstS = [regex]'(?s)const\s+S\s*=\s*\{.*?\}\s*;'
  # Matches: const styles = { … };
  $rxConstStyles = [regex]'(?s)const\s+styles\s*=\s*\{.*?\}\s*;'

  $new = $content

  $new = $rxConstS.Replace($new, {
    param($m)
    $txt = $m.Value
    if ($txt -match 'as\s+const\s*;') { return $txt }
    return ($txt -replace '\}\s*;\s*$', '} as const;')
  }, 1)

  $new = $rxConstStyles.Replace($new, {
    param($m)
    $txt = $m.Value
    if ($txt -match 'as\s+const\s*;') { return $txt }
    return ($txt -replace '\}\s*;\s*$', '} as const;')
  }, 1)

  return $new
}

# --- Apply fixes ---

foreach ($file in $apiFiles) {
  $txt = Get-Content -Raw -LiteralPath $file
  $out = Fix-Api-NextRequest -content $txt
  if ($out -ne $txt) {
    Set-FileContentUtf8 -Path $file -Content $out
    Write-Change -File $file -What "Purged NextRequest and normalised imports/types."
  }
}

foreach ($file in $styleFiles) {
  $txt = Get-Content -Raw -LiteralPath $file
  $out = Fix-AddConstAssertionToStyleBlock -content $txt
  if ($out -ne $txt) {
    Set-FileContentUtf8 -Path $file -Content $out
    Write-Change -File $file -What "Added 'as const' to style object to satisfy CSSProperties unions."
  }
}

"`nVerification:"
$leftNextReq = @(
  Select-String -Path "app/api/**/*.ts","app/api/**/*.tsx" -Pattern "NextRequest" -SimpleMatch -ErrorAction SilentlyContinue
)
if ($leftNextReq.Count -gt 0) {
  "  Still found NextRequest:"
  $leftNextReq | ForEach-Object { "    - {0}:{1}" -f $_.Path, $_.LineNumber }
} else { "  No NextRequest tokens remain in API." }

# Spot-check for common union offenders
$offenders = @(
  Select-String -Path "app/**/*.tsx" -Pattern "flexWrap\s*:","alignItems\s*:", "display\s*:\s*['""]flex['""]" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -Unique
)
"  Files with inline flex styles (post-fix, should be safe with const assertions): $($offenders.Count)"
$offenders | ForEach-Object { "    - $_" }

"`nRebuilding clean..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
attrib -R -S -H ".next" /S /D 2>$null
Remove-Item -Recurse -Force ".next" 2>$null
$env:NODE_ENV = "production"
npm run -s build
