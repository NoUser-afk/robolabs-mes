#!/bin/sh
set -eu

PROJECT_DIR="${ROBO_PULSE_PROJECT_DIR:-/home/admin_ttm/robolabs-mes}"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/autostart.log"

mkdir -p "$LOG_DIR"

{
  echo "[$(date -Is)] RoboPulse MES autostart requested"
  cd "$PROJECT_DIR"

  for attempt in $(seq 1 60); do
    if /usr/bin/docker info >/dev/null 2>&1; then
      echo "[$(date -Is)] Docker is ready on attempt $attempt"
      /usr/bin/docker compose up -d
      /usr/bin/docker compose ps
      echo "[$(date -Is)] RoboPulse MES autostart finished"
      exit 0
    fi

    echo "[$(date -Is)] Docker is not ready yet, attempt $attempt"
    sleep 5
  done

  echo "[$(date -Is)] Docker did not become ready in time"
  exit 1
} >> "$LOG_FILE" 2>&1
