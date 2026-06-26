# deploy.ps1 – Build and deploy QueueStorm Investigator to AWS EC2
# Usage: .\deploy.ps1 -ServerIP <elastic-ip> [-KeyFile ~/.ssh/id_rsa]
param(
    [Parameter(Mandatory=$true)] [string]$ServerIP,
    [string]$KeyFile = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$RemoteUser = "ec2-user"
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Building frontend ===" -ForegroundColor Cyan
Set-Location "$ROOT\frontend"
npm ci
npm run build

Write-Host "`n=== Building backend ===" -ForegroundColor Cyan
Set-Location "$ROOT\backend"
npm ci
npm run build

# Copy frontend dist into backend/public
Write-Host "`n=== Copying frontend into backend/public ===" -ForegroundColor Cyan
$publicDir = "$ROOT\backend\public"
if (Test-Path $publicDir) { Remove-Item $publicDir -Recurse -Force }
Copy-Item "$ROOT\frontend\dist" $publicDir -Recurse

Write-Host "`n=== Uploading to $ServerIP ===" -ForegroundColor Cyan
# Create remote directory
ssh -i $KeyFile -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIP}" "mkdir -p /opt/queuestorm/backend"

# Sync backend (compiled dist + public + package.json)
scp -i $KeyFile -r "$ROOT\backend\dist"         "${RemoteUser}@${ServerIP}:/opt/queuestorm/backend/"
scp -i $KeyFile -r "$ROOT\backend\public"        "${RemoteUser}@${ServerIP}:/opt/queuestorm/backend/"
scp -i $KeyFile    "$ROOT\backend\package.json"  "${RemoteUser}@${ServerIP}:/opt/queuestorm/backend/"
scp -i $KeyFile    "$ROOT\backend\package-lock.json" "${RemoteUser}@${ServerIP}:/opt/queuestorm/backend/" 2>$null

Write-Host "`n=== Installing dependencies and restarting ===" -ForegroundColor Cyan
ssh -i $KeyFile "${RemoteUser}@${ServerIP}" @"
  cd /opt/queuestorm/backend
  npm ci --omit=dev
  pm2 restart queuestorm 2>/dev/null || pm2 start dist/index.js --name queuestorm
  pm2 save
"@

Write-Host "`n=== Deployment complete! ===" -ForegroundColor Green
Write-Host "  Health: http://$ServerIP/health"
Write-Host "  API:    http://$ServerIP/analyze-ticket"
Write-Host "  UI:     http://$ServerIP"
