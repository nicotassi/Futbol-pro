#!/usr/bin/env bash
# Une todas las migraciones en un único archivo para pegar en el
# "SQL Editor" de Supabase (instalación sin terminal).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/instalacion/1-crear-base-de-datos.sql"
{
  echo "-- ============================================================================="
  echo "-- FUTBOLISTA PRO · Paso 1: crear la base de datos"
  echo "-- ============================================================================="
  echo "-- Copiá TODO este archivo, pegalo en Supabase → SQL Editor → New query"
  echo "-- y apretá \"Run\". Se ejecuta UNA sola vez en un proyecto nuevo."
  echo "--"
  echo "-- Archivo generado automáticamente con: npm run db:bundle"
  echo "-- (no editar a mano: la fuente son los archivos de supabase/migrations/)"
  echo "-- ============================================================================="
  echo
  echo "begin;"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    echo
    echo "-- >>>>> $(basename "$f")"
    cat "$f"
  done
  echo
  echo "commit;"
  echo
  echo "select 'Listo: base de datos de Futbolista Pro creada.' as resultado;"
} > "$OUT"
echo "Generado: ${OUT#$ROOT/}"
