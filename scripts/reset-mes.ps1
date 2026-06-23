param(
  [switch]$ForceDeleteVolumes
)

Write-Host "WARNING: reset-mes.ps1 can delete Docker volumes with PostgreSQL/uploads/runtime data." -ForegroundColor Yellow

if (-not $ForceDeleteVolumes) {
  Write-Host "Safe mode: volumes were NOT deleted. Use --% -ForceDeleteVolumes only when the local data is disposable." -ForegroundColor Green
  docker compose -p robolabs-mes down --remove-orphans
  exit $LASTEXITCODE
}

Write-Host "DANGER: deleting Docker volumes for robolabs-mes." -ForegroundColor Red
docker compose -p robolabs-mes down -v --remove-orphans
