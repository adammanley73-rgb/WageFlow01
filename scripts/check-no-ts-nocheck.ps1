$ErrorActionPreference = "Stop"

$roots = @("app","components","lib","src")

$hits = Get-ChildItem -Path $roots -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\\.next\\|\\\.git\\|\\dist\\|\\out\\|\\coverage\\|\\build\\|\\\.turbo\\|\\\.vercel\\|\\\.cache\\|\\\.restore\\|\\\.local\\|\\\.backups\\" } |
  Select-String -Pattern "@ts-nocheck" -SimpleMatch

if ($hits) {
  $hits | ForEach-Object { "{0}:{1} {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() } | Write-Host
  throw "Blocked: @ts-nocheck found. Remove it and fix typings instead."
}

Write-Host "OK: no @ts-nocheck found in app/components/lib/src."
