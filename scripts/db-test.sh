#!/usr/bin/env bash
# Ejecuta las migraciones reales y las pruebas de seguridad (RLS) contra un
# PostgreSQL común (sin Docker), usando una réplica mínima de Supabase.
#
# Uso:  PGHOST=/tmp PGPORT=54329 PGUSER=postgres npm run db:test
set -euo pipefail

DB="${FP_TEST_DB:-futbolista_pro_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X --set=client_min_messages=warning)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}" 2>/dev/null

echo "→ Réplica mínima de Supabase"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/00_supabase_shim.sql"

echo "→ Migraciones"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

echo "→ Pruebas"
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  echo "   $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -o /dev/null -f "$f"
done

"${PSQL[@]}" -d "$DB" -At -c "select format('✓ %s verificaciones de seguridad e integridad superadas', count(*)) from tests.results"
