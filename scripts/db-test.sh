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

# -----------------------------------------------------------------------------
# Instalación sin terminal (lo que hace papá desde el SQL Editor de Supabase)
# -----------------------------------------------------------------------------
echo "→ Instalación guiada (archivos de supabase/instalacion/)"
BUNDLE="$ROOT/supabase/instalacion/1-crear-base-de-datos.sql"
TMP_BUNDLE="$(mktemp)"
cp "$BUNDLE" "$TMP_BUNDLE"
bash "$ROOT/scripts/bundle-sql.sh" >/dev/null
if ! diff -q "$TMP_BUNDLE" "$BUNDLE" >/dev/null; then
  echo "✗ supabase/instalacion/1-crear-base-de-datos.sql estaba desactualizado (se regeneró: commitealo)." >&2
  rm -f "$TMP_BUNDLE"
  exit 1
fi
rm -f "$TMP_BUNDLE"

DB2="${DB}_guided"
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB2}" -c "create database ${DB2}" 2>/dev/null
"${PSQL[@]}" -d "$DB2" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
"${PSQL[@]}" -d "$DB2" -o /dev/null -f "$BUNDLE"

# Cuentas creadas desde el panel de Supabase (sin metadatos).
"${PSQL[@]}" -d "$DB2" -c "insert into auth.users (email) values ('papa@example.com'), ('benja@jugador.futbolista-pro.app')"

LINK="$(sed -e "s/'tu-email@ejemplo.com'/'Papa@Example.com'/" -e "s/'Papá';/'Nico';/" "$ROOT/supabase/instalacion/2-vincular-familia.sql")"
for run in 1 2; do  # dos veces: debe ser idempotente
  echo "$LINK" | "${PSQL[@]}" -d "$DB2" -o /dev/null
done

RESULT="$("${PSQL[@]}" -d "$DB2" -At -c "
  select (select count(*) from public.players)
    || '|' || (select count(*) from public.player_access)
    || '|' || (select string_agg(display_name || ':' || coalesce(username, '-'), ',' order by display_name) from public.profiles)")"
if [ "$RESULT" != "1|2|Benja:benja,Nico:-" ]; then
  echo "✗ La vinculación guiada no dio el resultado esperado: $RESULT" >&2
  exit 1
fi

# Error claro si falta una cuenta.
if echo "$LINK" | sed "s/'Papa@Example.com'/'nadie@example.com'/" | "${PSQL[@]}" -d "$DB2" -o /dev/null 2>"$ROOT/.db-test-err"; then
  echo "✗ Debía fallar con una cuenta inexistente" >&2; exit 1
fi
grep -q "No encontré la cuenta" "$ROOT/.db-test-err" || { cat "$ROOT/.db-test-err" >&2; exit 1; }
rm -f "$ROOT/.db-test-err"

echo "✓ Instalación guiada verificada (archivo único + vinculación idempotente)"
