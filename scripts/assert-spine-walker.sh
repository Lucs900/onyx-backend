#!/usr/bin/env bash
# Spine walker — eight locked preview cases. Hard Start over each case.
# Manager: bash scripts/assert-spine-walker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/scripts/spine-walker"
cd "$DIR"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

if [[ ! -d node_modules/playwright ]]; then
  npm install
fi

if [[ ! -f .browser-ok ]]; then
  npx playwright install chromium
  touch .browser-ok
fi

exec npx tsx walker.ts "$@"
