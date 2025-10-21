# File: C:\Users\adamm\Projects\wageflow01\tools\step5c_force_reboot.ps1
# Purpose: Force a reboot when Restart-Computer fails with "Invalid class".

$ErrorActionPreference = "Stop"

# Create a tiny marker so you know why the PC restarted
$marker = Join-Path $env:PUBLIC "Desktop\POST_REBOOT_RUN_STEP6.txt"
"After reboot: reinstall Docker Desktop (WSL2 engine), then run step4_verify_docker_pipe.ps1" | Out-File -FilePath $marker -Encoding UTF8 -Force

# Flush pending writes
[System.IO.File]::WriteAllText("$env:TEMP\flush.txt","ok")

# Force restart in 5 seconds, close apps without asking
Start-Process -FilePath "shutdown.exe" -ArgumentList "/r","/f","/t","5","/c","WageFlow Docker setup: forcing reboot" -WindowStyle Hidden
