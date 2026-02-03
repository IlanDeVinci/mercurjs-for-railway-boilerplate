param(
  [switch]$Down,
  [switch]$KillPorts
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
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


if (-not $Down -and -not $KillPorts) {
  Write-Host "Nothing to do. Try: .\scripts\dev-stop.ps1 -KillPorts -Down"
}