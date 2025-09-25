#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Run from repo root
Set-Location (Join-Path $PSScriptRoot "..")

# Clean .next cache
if (Test-Path ".\.next") { Remove-Item -Recurse -Force ".\.next" }

# Preview profile build
$env:BUILD_PROFILE = "preview"

# Build then start dev server
npm run build
npm run dev
