# WageFlow Preview Playbook

## Purpose
Make Preview builds reproducible and safe while core modules are still stubs. Keep production strict later, keep preview unblocked now.

## Local workflow

### One-shot: build, run smoketest, commit, push
```powershell
cd C:\Users\adamm\Projects\wageflow01
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
$env:BUILD_PROFILE="preview"
.\scripts\run-preview-pipeline.ps1 -CommitMessage "Preview: green smoketest, pushing for Vercel pin" -Port 3000 -TimeoutSec 180
