param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

function Resolve-PythonCommand {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return @('python') }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return @('py', '-3') }

  return $null
}

$cmd = Resolve-PythonCommand
if (-not $cmd) {
  Write-Host "Could not find Python (python/py)." -ForegroundColor Red
  Write-Host "Options:" -ForegroundColor Yellow
  Write-Host "  1) Install Python from https://www.python.org/downloads/" 
  Write-Host "  2) Or open index.html directly (file upload works; quiz list may not)." 
  Read-Host "Press Enter to exit" | Out-Null
  exit 1
}

$url = "http://localhost:$Port/"
Write-Host "Starting server in: $here" -ForegroundColor Cyan
Write-Host "Opening: $url" -ForegroundColor Cyan
Start-Process $url

# Run server in the current window; stop with Ctrl+C
& $cmd[0] @($cmd[1..($cmd.Count-1)]) -m http.server $Port
