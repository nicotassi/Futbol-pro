#!/usr/bin/env bash
# Publica la app en GitHub Pages (rama gh-pages): https://nicotassi.github.io/Futbol-pro/
# Los valores VITE_SUPABASE_* son públicos por diseño (la seguridad la da RLS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist-pages"
cd "$ROOT"

BASE_PATH=/Futbol-pro/ npx vite build --outDir "$OUT" --emptyOutDir
cp "$OUT/index.html" "$OUT/404.html"   # rutas internas al recargar la página
touch "$OUT/.nojekyll"

WT="$(mktemp -d)"
git fetch origin gh-pages 2>/dev/null || true
if git show-ref --quiet refs/remotes/origin/gh-pages; then
  git worktree add -B gh-pages "$WT" origin/gh-pages
else
  git worktree add --orphan -b gh-pages "$WT"
fi
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$OUT"/. "$WT"/
cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "Sin cambios para publicar."
else
  git commit -q -m "Publicación de Futbolista Pro ($(git -C "$ROOT" rev-parse --short HEAD))

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014yMAVchUbcwrwsdFQbrUHB"
  git push -u origin gh-pages
fi
cd "$ROOT"
git worktree remove --force "$WT"
echo "Publicado en https://nicotassi.github.io/Futbol-pro/"
