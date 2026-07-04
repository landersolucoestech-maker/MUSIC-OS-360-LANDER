#!/usr/bin/env bash
# Dumps Postgres from a running container or a DATABASE_URL.
# Usage:
#   ./scripts/pg-backup.sh                         # docker container musicos360_db
#   DATABASE_URL=... ./scripts/pg-backup.sh remote # remote dump via pg_dump in PATH
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/musicos360_${TIMESTAMP}.sql"

if [ "${1:-}" = "remote" ]; then
  : "${DATABASE_URL:?DATABASE_URL is required for remote mode}"
  pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" > "$OUT"
else
  CONTAINER=${CONTAINER:-musicos360_db}
  USER=${PGUSER:-musicos360}
  DB=${PGDATABASE:-musicos360}
  MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" --no-owner --no-privileges -f /tmp/dump.sql
  MSYS_NO_PATHCONV=1 docker cp "$CONTAINER:/tmp/dump.sql" "$OUT"
fi

echo "OK: $OUT ($(du -h "$OUT" | cut -f1))"
