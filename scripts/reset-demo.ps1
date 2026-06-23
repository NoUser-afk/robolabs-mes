param(
  [switch]$ForceDeleteVolumes
)

Write-Host "WARNING: reset-demo.ps1 can delete Docker volumes with PostgreSQL/uploads/runtime data." -ForegroundColor Yellow

if (-not $ForceDeleteVolumes) {
  Write-Host "Safe mode: volumes were NOT deleted. Use --% -ForceDeleteVolumes only for disposable local demo data." -ForegroundColor Green
  docker compose -p robolabs-mes-demo down --remove-orphans
  exit $LASTEXITCODE
}

Write-Host "DANGER: deleting Docker volumes for robolabs-mes-demo." -ForegroundColor Red
docker compose -p robolabs-mes-demo down -v --remove-orphans
