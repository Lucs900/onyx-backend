#!/usr/bin/env bash
# Unique READY letter proof. OIDC opens mailer=1; the unique then no-auth GETs
# /start?account=…&x-vercel-protection-bypass=… and must not land on vercel.com.
# Never print the secret, the token, or the letter URL.
set -euo pipefail

ORIGIN="${LETTER_BYPASS_ORIGIN:-}"
TOKEN="${VERCEL_OIDC_TOKEN:-}"

location_host() {
  local file="$1"
  HEADER_FILE="$file" python3 - <<'PY'
from pathlib import Path
import os
from urllib.parse import urlparse
host = ""
for line in Path(os.environ["HEADER_FILE"]).read_text(errors="replace").splitlines():
    if line.lower().startswith("location:"):
        try:
            host = urlparse(line.split(":", 1)[1].strip()).hostname or "unparsed"
        except Exception:
            host = "unparsed"
        break
print(host)
PY
}

origin_host="$(
  ORIGIN="$ORIGIN" python3 - <<'PY'
import os
from urllib.parse import urlparse
print(urlparse(os.environ.get("ORIGIN", "")).hostname or "none")
PY
)"

if [[ -z "$ORIGIN" || ! "$origin_host" =~ ^onyx-backend-[a-z0-9]+-onyx-direct\.vercel\.app$ ]]; then
  echo "letter-bypass: UNIQUE_ORIGIN missing or not a unique preview host (origin_host=${origin_host})" >&2
  exit 2
fi
if [[ -z "$TOKEN" ]]; then
  echo "letter-bypass: VERCEL_OIDC_TOKEN missing — agent testing uses x-vercel-trusted-oidc-idp-token / vercel curl. Never set-bypass-cookie." >&2
  exit 2
fi

header_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$header_file" "$body_file"' EXIT

control_code="$(
  curl -sS -D "$header_file" -o /dev/null -w '%{http_code}' --max-redirs 0 \
    "${ORIGIN}/start?account=probe" || true
)"
control_host="$(location_host "$header_file")"
echo "letter-bypass: no-auth /start?account=probe status=${control_code} location_host=${control_host}"

mailer_code="$(
  curl -sS -D "$header_file" -o "$body_file" -w '%{http_code}' --max-redirs 0 \
    -H "x-vercel-trusted-oidc-idp-token: ${TOKEN}" \
    "${ORIGIN}/api/account?mailer=1" || true
)"
mailer_host="$(location_host "$header_file")"
echo "letter-bypass: OIDC /api/account?mailer=1 status=${mailer_code} location_host=${mailer_host:-none}"
if [[ "$mailer_code" != "200" ]]; then
  echo "letter-bypass: mailer did not return 200. Use x-vercel-trusted-oidc-idp-token / vercel curl. Never set-bypass-cookie." >&2
  exit 3
fi

BODY_FILE="$body_file" python3 - <<'PY'
import json
import os
import sys
from pathlib import Path

try:
    data = json.loads(Path(os.environ["BODY_FILE"]).read_text())
except Exception:
    print("letter-bypass: mailer body was not JSON", file=sys.stderr)
    sys.exit(3)
has = bool(data.get("letterHasBypass"))
opens = bool(data.get("letterOpensWithoutVercelLogin"))
status = data.get("probeStatus")
host = data.get("probeLocationHost") or "none"
print(
    f"letter-bypass: letterHasBypass={has} letterOpensWithoutVercelLogin={opens} probeStatus={status} probeLocationHost={host}"
)
if not has:
    print("letter-bypass: Preview missing VERCEL_AUTOMATION_BYPASS_SECRET — block READY", file=sys.stderr)
    sys.exit(2)
if not opens:
    print("letter-bypass: no-auth letter GET still hit Vercel login or failed — block READY", file=sys.stderr)
    sys.exit(3)
print("letter-bypass: PASS no-auth letter GET is not vercel.com/login")
PY
