# C:\Users\adamm\Projects\wageflow01\tools\Write-Migration.ps1
$Target = 'C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251016_120000_multi_frequency_core.sql'
$Content = @'
-- paste the SQL from the migration file here if you want to generate via script
'@
$dir = Split-Path -Parent $Target
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Target, $Content, $utf8NoBom)
Write-Host "Wrote $Target"
