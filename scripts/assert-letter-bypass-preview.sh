#!/usr/bin/env bash
# Unique create-host mailer proof. OIDC opens mailer=1 on the souvenir.
# Borrower letter must be start.onyxdirect.com with no protection-bypass.
# Unique /start without auth must still hit Vercel SSO (575fee8 workshop stays).
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
echo "letter-bypass: no-auth unique /start?account=probe status=${control_code} location_host=${control_host}"
if [[ "$control_host" != *vercel.com* && "$control_code" != "401" && "$control_code" != "403" ]]; then
  echo "letter-bypass: unique preview is no longer Deployment Protected — do not disable protection on souvenirs" >&2
  exit 3
fi

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

dns_code="$(
  curl -sS -D "$header_file" -o /dev/null -w '%{http_code}' --max-redirs 0 \
    "https://start.onyxdirect.com/start?path=acr" || true
)"
dns_host="$(location_host "$header_file")"
echo "letter-bypass: no-auth start.onyxdirect.com/start?path=acr status=${dns_code} location_host=${dns_host:-none}"

BODY_FILE="$body_file" DNS_CODE="$dns_code" DNS_HOST="$dns_host" python3 - <<'PY'
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
origin = str(data.get("letterOrigin") or "")
frm = str(data.get("from") or "")
unique = bool(data.get("letterHostIsUniquePreview"))
dns_code = str(os.environ.get("DNS_CODE") or "")
dns_host = str(os.environ.get("DNS_HOST") or "")
print(
    f"letter-bypass: letterOrigin={origin} from={frm} letterHasBypass={has} "
    f"letterHostIsUniquePreview={unique} letterOpensWithoutVercelLogin={opens} "
    f"probeStatus={status} probeLocationHost={host} dnsStatus={dns_code} dnsHost={dns_host}"
)
if origin.rstrip("/") != "https://start.onyxdirect.com":
    print("letter-bypass: borrower letter origin is not https://start.onyxdirect.com — block READY", file=sys.stderr)
    sys.exit(2)
if "lucas@onyxdirect.com" not in frm.lower() or "ONYX Direct" not in frm:
    print("letter-bypass: From is not ONYX Direct <lucas@onyxdirect.com> — block READY", file=sys.stderr)
    sys.exit(2)
if has:
    print("letter-bypass: borrower letter still has protection-bypass — block READY", file=sys.stderr)
    sys.exit(2)
if unique:
    print("letter-bypass: borrower letter still points at unique souvenir — block READY", file=sys.stderr)
    sys.exit(2)
if dns_code in {"000", "0"} or not dns_code:
    print("letter-bypass: PASS letter shape is start.onyxdirect.com with no bypass — DNS still needed before InPrivate")
    sys.exit(0)
if dns_host.endswith("vercel.com") or dns_code in {"401", "403"}:
    print("letter-bypass: start.onyxdirect.com hit Vercel login — do not disable unique protection; unprotect only this host", file=sys.stderr)
    sys.exit(3)
print("letter-bypass: PASS borrower letter is start.onyxdirect.com, no bypass, no Vercel login")
PY
