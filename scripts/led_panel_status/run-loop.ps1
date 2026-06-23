$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  & (Join-Path $root "setup.ps1")
}
& $python (Join-Path $root "panel_status.py") @args
