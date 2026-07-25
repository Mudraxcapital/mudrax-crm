# Restart Mudrax CRM local app:
# 1) Kill whatever is bound to port 3000
# 2) Ensure Postgres/Redis are up (Docker)
# 3) Start Next.js (npm run dev)
#
# Usage (from repo root):
#   npm run restart
#   .\scripts\restart-dev.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Port = 3000

Write-Host ""
Write-Host "Mudrax CRM - restart" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "Stopping processes on port $Port..." -ForegroundColor Cyan

$pids = @()

try {
  $pids = @(
    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      Where-Object { $_ -and $_ -ne 0 }
  )
} catch {
  $pids = @()
}

if ($pids.Count -eq 0) {
  $lines = netstat -ano | Select-String -Pattern (":" + $Port + "\s")
  foreach ($line in $lines) {
    $parts = @(($line.ToString() -split "\s+") | Where-Object { $_ -ne "" })
    if ($parts.Count -gt 0) {
      $procIdText = $parts[$parts.Count - 1]
      if ($procIdText -match "^\d+$") {
        $procIdNum = [int]$procIdText
        if ($procIdNum -gt 0) {
          $pids += $procIdNum
        }
      }
    }
  }
  $pids = @($pids | Select-Object -Unique)
}

if ($pids.Count -eq 0) {
  Write-Host "  No process was listening on port $Port." -ForegroundColor DarkGray
} else {
  foreach ($procIdNum in $pids) {
    $proc = Get-Process -Id $procIdNum -ErrorAction SilentlyContinue
    if ($proc) {
      $procName = $proc.ProcessName
    } else {
      $procName = "unknown"
    }
    Stop-Process -Id $procIdNum -Force -ErrorAction SilentlyContinue
    Write-Host ("  Killed " + $procName + " (PID " + $procIdNum + ")") -ForegroundColor Yellow
  }
  Start-Sleep -Milliseconds 500
}

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($null -ne $dockerCmd) {
  Write-Host "Ensuring Postgres + Redis are running..." -ForegroundColor Cyan
  docker compose up -d postgres redis
} else {
  Write-Host "Docker not found - skipping postgres/redis bring-up." -ForegroundColor DarkYellow
}

Write-Host ("Starting Next.js on http://localhost:" + $Port + " ...") -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

npm run dev
