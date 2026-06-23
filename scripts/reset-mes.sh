#!/usr/bin/env sh
set -eu

echo "WARNING: reset-mes.sh can delete Docker volumes with PostgreSQL/uploads/runtime data." >&2

if [ "${1:-}" != "--force-delete-volumes" ]; then
  echo "Safe mode: volumes were NOT deleted. Pass --force-delete-volumes only when the local data is disposable." >&2
  docker compose -p robolabs-mes down --remove-orphans
  exit $?
fi

echo "DANGER: deleting Docker volumes for robolabs-mes." >&2
docker compose -p robolabs-mes down -v --remove-orphans
