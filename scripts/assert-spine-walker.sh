#!/usr/bin/env bash
# Spine walker — eight locked preview cases. Hard Start over each case.
#
# Preferred (OIDC, after vercel login / VERCEL_TOKEN):
#   npx vercel env run -- bash scripts/assert-spine-walker.sh
#   npx vercel env pull .env.local --yes && bash scripts/assert-spine-walker.sh
#
# Fallback: set VERCEL_AUTOMATION_BYPASS_SECRET (do not commit it).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/scripts/spine-walker"
cd "$DIR"

# Recursion guard for `vercel env run -- this-script`
ALREADY_WRAPPED="${SPINE_WALKER_AUTH_WRAPPED:-0}"

source_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

have_preview_auth() {
  [[ -n "${VERCEL_OIDC_TOKEN:-}" || -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]]
}

vercel_logged_in() {
  [[ -n "${VERCEL_TOKEN:-}" ]] || timeout 12 npx --yes vercel whoami >/dev/null 2>&1
}

ensure_vercel_link() {
  if [[ -f "$ROOT/.vercel/project.json" ]]; then
    return 0
  fi
  mkdir -p "$ROOT/.vercel"
  # Public identifiers from the Vercel GitHub comment on PR 18 (not a secret).
  cat > "$ROOT/.vercel/project.json" <<'JSON'
{
  "projectId": "prj_fwzNdthu8kInqmXMWVU9uc5fNUXT",
  "orgId": "team_j7nbpQaQOtI5nb5yLbx7wjjD",
  "projectName": "onyx-backend"
}
JSON
}

pull_oidc_env() {
  local pulled
  pulled="$(mktemp)"
  if npx --yes vercel env pull "$pulled" --yes --environment development --cwd "$ROOT" >/dev/null 2>&1; then
    source_env_file "$pulled"
  fi
  rm -f "$pulled"
}

source_env_file "$ROOT/.env.local"

if ! have_preview_auth && [[ "$ALREADY_WRAPPED" != "1" ]] && vercel_logged_in; then
  ensure_vercel_link
  pull_oidc_env
  if ! have_preview_auth; then
    export SPINE_WALKER_AUTH_WRAPPED=1
    exec npx --yes vercel env run --cwd "$ROOT" --scope onyx-direct -- bash "$ROOT/scripts/assert-spine-walker.sh" "$@"
  fi
fi

if ! have_preview_auth; then
  echo "spine-walker: no VERCEL_OIDC_TOKEN or VERCEL_AUTOMATION_BYPASS_SECRET in the environment." >&2
  echo "Manager (OIDC, preferred):" >&2
  echo "  npx vercel login" >&2
  echo "  npx vercel link --yes --project onyx-backend --scope onyx-direct" >&2
  echo "  npx vercel env pull .env.local --yes && bash scripts/assert-spine-walker.sh" >&2
  echo "  # or: npx vercel env run -- bash scripts/assert-spine-walker.sh" >&2
  echo "Fallback: set VERCEL_AUTOMATION_BYPASS_SECRET from Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. Do not commit it." >&2
fi

if [[ ! -d node_modules/playwright ]]; then
  npm install
fi

if [[ "${CI:-}" == "true" ]]; then
  npx playwright install --with-deps chromium
  touch .browser-ok
elif [[ ! -f .browser-ok ]]; then
  npx playwright install chromium
  touch .browser-ok
fi

exec npx tsx walker.ts "$@"
