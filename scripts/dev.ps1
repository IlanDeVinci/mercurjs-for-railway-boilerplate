param(
  [ValidateSet('local','docker','none')]
  [string]$Backend = 'local',

  [switch]$NoFrontends,
  [switch]$NoInfra,
  [switch]$NoChat,

  [switch]$Install,
  [switch]$ForceEnv,

  [int]$AdminPort = 5173,
  [int]$VendorPort = 5174,
  [int]$StorefrontPort = 3000,
  [int]$BackendPort = 9000
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function Assert-LastExitCode {
  param(
    [Parameter(Mandatory=$true)][string]$Context
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Context failed with exit code $LASTEXITCODE"
  }
}

function Ensure-FileFromTemplate {
  param(
    [Parameter(Mandatory=$true)][string]$TargetPath,
    [Parameter(Mandatory=$true)][string]$TemplatePath
  )

  if (Test-Path $TargetPath) {
    if (-not $ForceEnv) {
      return
    }
  }

  if (-not (Test-Path $TemplatePath)) {
    throw "Template not found: $TemplatePath"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $TargetPath) | Out-Null
  Copy-Item -Force $TemplatePath $TargetPath
}

function Upsert-DotenvValue {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Key,
    [Parameter(Mandatory=$true)][string]$Value
  )

  if (-not (Test-Path $Path)) {
    throw "Env file not found: $Path"
  }

  $content = Get-Content -Raw -Path $Path
  $pattern = "(?m)^\s*" + [regex]::Escape($Key) + "\s*=.*$"

  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, "$Key=$Value")
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) {
      $content += "`r`n"
    }
    $content += "$Key=$Value`r`n"
  }

  Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Start-Proc {
  param(
    [Parameter(Mandatory=$true)][string]$Cwd,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Command,
    [hashtable]$ExtraEnv
  )

  $envPrefix = ''
  if ($ExtraEnv) {
    foreach ($k in $ExtraEnv.Keys) {
      $v = $ExtraEnv[$k]
      $envPrefix += "`$env:$k = '" + ($v -replace "'","''") + "'; "
    }
  }

  $full = "Set-Location -LiteralPath '" + ($Cwd -replace "'","''") + "'; " + $envPrefix + $Command
  Start-Process -WorkingDirectory $Cwd -WindowStyle Normal -FilePath "powershell.exe" -ArgumentList @('-NoExit','-Command', $full) | Out-Null
  Write-Host "Started: $Title"
}

function Wait-TcpPort {
  param(
    [Parameter(Mandatory=$true)][string]$Hostname,
    [Parameter(Mandatory=$true)][int]$Port,
    [int]$TimeoutSeconds = 45,
    [int]$DelayMs = 500
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect($Hostname, $Port, $null, $null)
      if ($iar.AsyncWaitHandle.WaitOne($DelayMs, $false) -and $client.Connected) {
        $client.Close()
        return
      }
      $client.Close()
    } catch {
      # ignore
    }
    Start-Sleep -Milliseconds $DelayMs
  }
  throw "Timed out waiting for ${Hostname}:$Port"
}

Write-Host "Repo root: $root"

# 1) Infra via Docker
if (-not $NoInfra) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or not on PATH. Install Docker Desktop first."
  }

  docker info | Out-Null
  Assert-LastExitCode -Context 'Docker engine check (docker info)'

  Push-Location $root
  try {
    $baseServices = @('postgres','redis','meilisearch')
    Write-Host "Starting Docker infra: $($baseServices -join ', ')"
    docker compose up -d @baseServices | Out-Host
    Assert-LastExitCode -Context 'docker compose up (postgres/redis/meilisearch)'

    if (-not $NoChat) {
      Write-Host 'Starting chat (Docker build)'
      docker compose up -d --build chat | Out-Host
      if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Chat failed to build/start. You can continue without it using: .\scripts\dev.ps1 -NoChat'
        Write-Warning 'If this is a Docker Desktop snapshot/cache issue, try restarting Docker Desktop or running: docker builder prune -a'
      }
    }

    if ($Backend -eq 'docker') {
      Write-Host "Starting backend in Docker (compose profile: backend)"
      docker compose --profile backend up -d --build backend | Out-Host
      Assert-LastExitCode -Context 'docker compose up (backend profile)'
    }
  } finally {
    Pop-Location
  }
}

# 2) Ensure env files exist (and patch key defaults that commonly break Windows dev)
$backendEnv = Join-Path $root 'backend\.env'
$backendEnvTemplate = Join-Path $root 'backend\.env.template'
$storefrontEnv = Join-Path $root 'storefront\.env.local'
$storefrontEnvTemplate = Join-Path $root 'storefront\.env.template'
$adminEnv = Join-Path $root 'admin-panel\.env.local'
$adminEnvTemplate = Join-Path $root 'admin-panel\.env.template'
$vendorEnv = Join-Path $root 'vendor-panel\.env.local'
$vendorEnvTemplate = Join-Path $root 'vendor-panel\.env.template'

Ensure-FileFromTemplate -TargetPath $backendEnv -TemplatePath $backendEnvTemplate
Ensure-FileFromTemplate -TargetPath $storefrontEnv -TemplatePath $storefrontEnvTemplate
Ensure-FileFromTemplate -TargetPath $adminEnv -TemplatePath $adminEnvTemplate
Ensure-FileFromTemplate -TargetPath $vendorEnv -TemplatePath $vendorEnvTemplate

# Backend local mode: make sure Redis uses IPv4 loopback to avoid ::1 resolution issues.
if ($Backend -eq 'local') {
  Upsert-DotenvValue -Path $backendEnv -Key 'REDIS_URL' -Value 'redis://127.0.0.1:6379'
  Upsert-DotenvValue -Path $backendEnv -Key 'DATABASE_URL' -Value 'postgres://postgres:postgres@127.0.0.1:5433/mercurjs?sslmode=disable'
}

# Ensure chat URL vars exist for UIs
Upsert-DotenvValue -Path $storefrontEnv -Key 'NEXT_PUBLIC_CHAT_URL' -Value 'http://localhost:4010'
Upsert-DotenvValue -Path $adminEnv -Key 'VITE_CHAT_URL' -Value 'http://localhost:4010'
Upsert-DotenvValue -Path $vendorEnv -Key 'VITE_CHAT_URL' -Value 'http://localhost:4010'

# 3) Optional install
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm not found. Install it with: npm i -g pnpm"
}

function Ensure-PnpmInstall {
  param(
    [Parameter(Mandatory=$true)][string]$Dir
  )

  $nodeModules = Join-Path $Dir 'node_modules'
  if ($Install -or -not (Test-Path $nodeModules)) {
    Write-Host "Installing deps in: $Dir"
    Push-Location $Dir
    try {
      pnpm install
      Assert-LastExitCode -Context "pnpm install ($Dir)"
    } finally {
      Pop-Location
    }
  }
}

Ensure-PnpmInstall -Dir (Join-Path $root 'backend')
Ensure-PnpmInstall -Dir (Join-Path $root 'storefront')
Ensure-PnpmInstall -Dir (Join-Path $root 'admin-panel')
Ensure-PnpmInstall -Dir (Join-Path $root 'vendor-panel')

if (-not $NoInfra) {
  Write-Host 'Waiting for infra ports...'
  Wait-TcpPort -Hostname '127.0.0.1' -Port 5433 -TimeoutSeconds 60
  Wait-TcpPort -Hostname '127.0.0.1' -Port 6379 -TimeoutSeconds 60
  Wait-TcpPort -Hostname '127.0.0.1' -Port 7700 -TimeoutSeconds 60
  if (-not $NoChat) {
    Wait-TcpPort -Hostname '127.0.0.1' -Port 4010 -TimeoutSeconds 60
  }
}

# 4) Launch apps
if ($Backend -eq 'local') {
  Start-Proc -Cwd (Join-Path $root 'backend') -Title 'backend' -Command 'pnpm dev'
} elseif ($Backend -eq 'docker') {
  Write-Host "Backend is running in Docker on http://localhost:$BackendPort"
} else {
  Write-Host 'Backend launch skipped.'
}

if (-not $NoFrontends) {
  Start-Proc -Cwd (Join-Path $root 'storefront') -Title 'storefront' -Command 'pnpm dev'
  Start-Proc -Cwd (Join-Path $root 'admin-panel') -Title 'admin-panel' -Command 'pnpm dev' -ExtraEnv @{ PORT = "$AdminPort" }
  Start-Proc -Cwd (Join-Path $root 'vendor-panel') -Title 'vendor-panel' -Command 'pnpm dev' -ExtraEnv @{ PORT = "$VendorPort" }
}

Write-Host ''
Write-Host 'URLs:'
Write-Host "- Backend:     http://localhost:$BackendPort"
Write-Host "- Storefront:  http://localhost:$StorefrontPort"
Write-Host "- Admin:       http://localhost:$AdminPort"
Write-Host "- Vendor:      http://localhost:$VendorPort"
Write-Host "- Chat (api):  http://localhost:4010/health"
Write-Host "- Meili:       http://localhost:7700/health"