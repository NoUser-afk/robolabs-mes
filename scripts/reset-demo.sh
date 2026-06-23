#!/usr/bin/env sh
set -eu

echo "WARNING: reset-demo.sh can delete Docker volumes with PostgreSQL/uploads/runtime data." >&2

if [ "${1:-}" != "--force-delete-volumes" ]; then
  echo "Safe mode: volumes were NOT deleted. Pass --force-delete-volumes only for disposable local demo data." >&2
  docker compose -p robolabs-mes-demo down --remove-orphans
  exit $?
fi

echo "DANGER: deleting Docker volumes for robolabs-mes-demo." >&2
docker compose -p robolabs-mes-demo down -v --remove-orphans
