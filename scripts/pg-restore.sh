#!/usr/bin/env bash
# Restores Postgres dump into a fresh database.
# Usage:
#   ./scripts/pg-restore.sh backups/musicos360_YYYYMMDD_HHMMSS.sql [target_db_name]
set -euo pipefail

DUMP_FILE=${1:?Path to .sql dump required}
TARGET_DB=${2:-musicos360_restore}
CONTAINER=${CONTAINER:-musicos360_db}
USER=${PGUSER:-musicos360}
ADMIN_DB=${PGADMIN_DB:-postgres}
SHIM_FILE=${SHIM_FILE:-apps/api/scripts/local-auth-shim.sql}

[ -f "$DUMP_FILE" ] || { echo "ERROR: $DUMP_FILE not found"; exit 1; }

echo "[restore] target=$TARGET_DB container=$CONTAINER"
docker exec "$CONTAINER" psql -U "$USER" -d "$ADMIN_DB" -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
docker exec "$CONTAINER" psql -U "$USER" -d "$ADMIN_DB" -c "CREATE DATABASE \"$TARGET_DB\";"

if [ -f "$SHIM_FILE" ]; then
  MSYS_NO_PATHCONV=1 docker cp "$SHIM_FILE" "$CONTAINER:/tmp/shim.sql"
  MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" psql -U "$USER" -d "$TARGET_DB" -f /tmp/shim.sql >/dev/null
fi

MSYS_NO_PATHCONV=1 docker cp "$DUMP_FILE" "$CONTAINER:/tmp/restore.sql"
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" psql -U "$USER" -d "$TARGET_DB" -f /tmp/restore.sql > /tmp/restore.log 2>&1 || { tail -30 /tmp/restore.log; exit 1; }

echo "[restore] OK"
docker exec "$CONTAINER" psql -U "$USER" -d "$TARGET_DB" -c "
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public') AS fks,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public') AS rls_policies;
"
