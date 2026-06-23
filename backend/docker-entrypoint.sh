#!/usr/bin/env sh
set -eu

mkdir -p /app/uploads /app/data

if [ "${AUTO_DB_PUSH:-false}" = "true" ]; then
  echo "WARNING: AUTO_DB_PUSH=true, executing 'npx prisma db push'. Use only for controlled demo initialization."
  npx prisma db push
else
  echo "AUTO_DB_PUSH is disabled. Skipping automatic Prisma db push on startup."
fi

node dist/src/main.js
