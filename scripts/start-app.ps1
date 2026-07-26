# ============================================================================
# Mudrax CRM - full local start
#
# 1) Ensure .env exists
# 2) Start Postgres + Redis (Docker)
# 3) Wait until Postgres is healthy
# 4) Free port 3000 if something is already bound
# 5) Generate Prisma client
# 6) Start Next.js (npm run dev)
#
# Usage (from repo root):
#   npm run app:start
#   npm run app:start:docker
#   .\scripts\start-app.ps1
#   .\scripts\start-app.ps1 -FullDocker
# ============================================================================

param(
  [switch]$FullDocker,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host ("-> " + $Message) -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host ("  " + $Message) -ForegroundColor DarkGray
}

function Assert-Docker {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($null -eq $docker) {
    throw "Docker is not installed or not on PATH. Install Docker Desktop and try again."
  }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not running. Start Docker Desktop and try again."
  }
}

function Ensure-EnvFile {
  $envPath = Join-Path $Root ".env"
  if (Test-Path $envPath) {
    Write-Ok ".env found"
    return
  }

  $example = Join-Path $Root ".env.example"
  if (-not (Test-Path $example)) {
    throw ".env is missing and .env.example was not found."
  }

  Copy-Item $example $envPath
  Write-Host "  Created .env from .env.example - review secrets if needed." -ForegroundColor Yellow
}

function Stop-PortListeners {
  param([int]$ListenPort)

  $pids = @()
  try {
    $pids = @(
      Get-NetTCPConnection -LocalPort $ListenPort -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -and $_ -ne 0 }
    )
  } catch {
    $pids = @()
  }

  if ($pids.Count -eq 0) {
    $pattern = ":" + $ListenPort + "\s"
    $lines = netstat -ano | Select-String -Pattern $pattern
    foreach ($line in $lines) {
      $parts = @(($line.ToString() -split "\s+") | Where-Object { $_ -ne "" })
      if ($parts.Count -gt 0 -and $parts[-1] -match "^\d+$") {
        $procIdNum = [int]$parts[-1]
        if ($procIdNum -gt 0) {
          $pids += $procIdNum
        }
      }
    }
    $pids = @($pids | Select-Object -Unique)
  }

  if ($pids.Count -eq 0) {
    Write-Ok ("Port " + $ListenPort + " is free")
    return
  }

  foreach ($procIdNum in $pids) {
    $proc = Get-Process -Id $procIdNum -ErrorAction SilentlyContinue
    if ($proc) {
      $name = $proc.ProcessName
    } else {
      $name = "unknown"
    }
    Stop-Process -Id $procIdNum -Force -ErrorAction SilentlyContinue
    Write-Host ("  Stopped " + $name + " (PID " + $procIdNum + ") on port " + $ListenPort) -ForegroundColor Yellow
  }
  Start-Sleep -Milliseconds 600
}

function Wait-PostgresHealthy {
  param([int]$TimeoutSeconds = 90)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $status = & docker inspect -f "{{.State.Health.Status}}" mudrax-crm-postgres 2>$null
    if ($status -eq "healthy") {
      Write-Ok "Postgres is healthy"
      return
    }
    Start-Sleep -Seconds 2
  }

  throw ("Postgres did not become healthy within " + $TimeoutSeconds + "s. Check: docker compose logs postgres")
}

Write-Host ""
Write-Host "Mudrax CRM - full start" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor DarkGray

Write-Step "Checking environment"
Ensure-EnvFile
Assert-Docker
Write-Ok "Docker is available"

if ($FullDocker) {
  Write-Step "Starting full stack in Docker (app + postgres + redis)"
  Stop-PortListeners -ListenPort $Port
  & docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed"
  }
  Write-Host ""
  Write-Host "Stack is starting." -ForegroundColor Green
  Write-Host ("  App:      http://localhost:" + $Port) -ForegroundColor White
  Write-Host "  Logs:     npm run docker:logs" -ForegroundColor DarkGray
  Write-Host "  Stop:     npm run docker:down" -ForegroundColor DarkGray
  Write-Host ""
  & docker compose logs -f app
  exit $LASTEXITCODE
}

Write-Step "Starting Postgres + Redis"
& docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start postgres/redis"
}

Write-Step "Waiting for Postgres"
Wait-PostgresHealthy

Write-Step "Preparing Prisma client"
& npx prisma generate
if ($LASTEXITCODE -ne 0) {
  throw "prisma generate failed"
}

Write-Step ("Freeing port " + $Port)
Stop-PortListeners -ListenPort $Port

Write-Host ""
Write-Host ("Starting Next.js on http://localhost:" + $Port + " ...") -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "  Infra: Docker (postgres + redis)" -ForegroundColor DarkGray
Write-Host "  App:   local npm run dev" -ForegroundColor DarkGray
Write-Host "  Stop:  Ctrl+C  (containers keep running)" -ForegroundColor DarkGray
Write-Host "  Down:  npm run docker:down" -ForegroundColor DarkGray
Write-Host ""

& npm run dev
