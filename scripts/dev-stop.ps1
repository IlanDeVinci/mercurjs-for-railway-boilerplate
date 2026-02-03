param(
  [switch]$Down,
  [switch]$KillPorts
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$procFile = Join-Path $root '.dev-processes.json'

function Stop-TrackedProcesses {
  if (-not (Test-Path $procFile)) {
    return
  }

  try {
    $items = Get-Content -Raw -Path $procFile | ConvertFrom-Json
  } catch {
    Remove-Item -Force -Path $procFile -ErrorAction SilentlyContinue
    return
  }

  foreach ($item in $items) {
    $procId = $item.Id
    if (-not $procId) {
      continue
    }
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
      try {
        $null = $proc.CloseMainWindow()
        Start-Sleep -Milliseconds 500
      } catch {
        # ignore
      }
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }

  Remove-Item -Force -Path $procFile -ErrorAction SilentlyContinue
  Write-Host 'Closed dev terminals started by dev.ps1.'
}
if ($Down) {
  Push-Location $root
  try {
    docker compose down | Out-Host
  } finally {
    Pop-Location
  }
  Write-Host 'Docker compose down completed.'
}

if ($KillPorts) {
  $ports = @(9000,3000,5173,5174,4010,7700)
  foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
      Where-Object { $_.State -eq 'Listen' } |
      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  }
  Write-Host 'Killed local dev servers by port.'
}

if ($Down -or $KillPorts) {
  Stop-TrackedProcesses
}


if (-not $Down -and -not $KillPorts) {
  Write-Host "Nothing to do. Try: .\scripts\dev-stop.ps1 -KillPorts -Down"
}