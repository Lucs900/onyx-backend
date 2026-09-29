#!/usr/bin/env bash
# Six Alameda-only spine walks: 3× 563198f, 3× this SHA. Does not change income code.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ALAMEDA_FLAKE_JSON:-/tmp/alameda-flake-runs.json}"
DIR="$(mktemp -d)"
: "${BASELINE_URL:?set BASELINE_URL to the 563198f start URL}"
: "${REVERT_URL:?set REVERT_URL to the 64-revert start URL}"
: "${BASELINE_SHA:=563198fa8c460e9edc2a24448117b94f04715de1}"
: "${REVERT_SHA:=unknown}"

cd "$ROOT"
if [[ ! -d node_modules/next || ! -d node_modules/playwright || ! -d node_modules/ai ]]; then
  echo "alameda-flake: npm install at repo root"
  npm install
fi
if [[ "${CI:-}" == "true" ]]; then
  npx playwright install --with-deps chromium || npx playwright install chromium
fi

run_one() {
  local label="$1" sha="$2" url="$3" n="$4"
  local log="$DIR/${label}-${n}.log"
  local meta="$DIR/${label}-${n}.json"
  echo "alameda-flake: $label #$n $url"
  set +e
  (
    export SPINE_WALKER_URL="$url"
    export SPINE_WALKER_ONLY=25
    export SPINE_WALKER_SKIP_LEFTOVERS=1
    export CI=true
    bash "$ROOT/scripts/assert-spine-walker.sh"
  ) >"$log" 2>&1
  local code=$?
  set -e
  tail -n 40 "$log" || true
  python3 - "$label" "$sha" "$url" "$n" "$log" "$code" "$meta" <<'PY'
import json, re, sys
label, sha, url, n, log_path, code, meta_path = sys.argv[1:8]
text = open(log_path, encoding="utf-8", errors="replace").read()
result = "PASS" if "25 PASS" in text else "FAIL"
spoken = ""
for pat in (
    r"Alameda Health System\. Period \$[0-9,]+\.[0-9]{2}",
    r"Period \$[0-9,]+\.[0-9]{2}",
):
    found = re.findall(pat, text)
    if found:
        spoken = found[-1]
        break
period = "unknown"
m = re.search(r"Period \$([0-9,]+\.[0-9]{2})", spoken or text)
if m:
    period = m.group(1).replace(",", "")
row = {
    "label": label,
    "n": int(n),
    "sha": sha,
    "url": url,
    "result": result,
    "exit": int(code),
    "gross_period": period,
    "spoken": spoken,
}
open(meta_path, "w", encoding="utf-8").write(json.dumps(row) + "\n")
print(f"alameda-flake: {label} #{n} {result} gross_period={period} spoken={spoken or 'none'}")
PY
}

for n in 1 2 3; do
  run_one "563198f" "$BASELINE_SHA" "$BASELINE_URL" "$n"
done
for n in 1 2 3; do
  run_one "64-revert" "$REVERT_SHA" "$REVERT_URL" "$n"
done

python3 - "$OUT" "$DIR" "$BASELINE_SHA" "$REVERT_SHA" "$BASELINE_URL" "$REVERT_URL" <<'PY'
import json, pathlib, sys
out, folder, baseline_sha, revert_sha, baseline_url, revert_url = sys.argv[1:7]
runs = []
for path in sorted(pathlib.Path(folder).glob("*.json")):
    runs.append(json.loads(path.read_text()))
doc = {
    "baseline_sha": baseline_sha,
    "revert_sha": revert_sha,
    "baseline_url": baseline_url,
    "revert_url": revert_url,
    "runs": runs,
}
pathlib.Path(out).write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print("alameda-flake: wrote", out)
print(json.dumps(doc, indent=2))
PY
