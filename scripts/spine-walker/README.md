# Spine walker

Playwright walk of the eight locked preview cases. Not a product slice. Hard **Start over** each case. A handwritten walk is not PASS.

## Preview

https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr

## How Manager runs it

The preview is behind Vercel Authentication. Playwright sends an origin-scoped header on every request **before the first navigation**:

- preferred: `x-vercel-trusted-oidc-idp-token: $VERCEL_OIDC_TOKEN`
- fallback: `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET` plus `x-vercel-set-bypass-cookie: true`

Do not disable Deployment Protection. Do not commit `.env.local` or the secret.

### OIDC (preferred)

From the repo root, on this preview branch, with Vercel CLI logged in (`npx vercel login` or `VERCEL_TOKEN`) and the project linked to team **onyx-direct** / project **onyx-backend**:

```bash
npx vercel env pull .env.local --yes
bash scripts/assert-spine-walker.sh
```

or, without writing a file:

```bash
npx vercel env run -- bash scripts/assert-spine-walker.sh
```

`bash scripts/assert-spine-walker.sh` also sources `.env.local` if present, and if the CLI is already logged in it will `env pull` (to a temp file) or wrap itself in `vercel env run`.

### Automation bypass (fallback)

If OIDC pull is unavailable, create a secret in Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. Then:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET='…' bash scripts/assert-spine-walker.sh
```

Do not commit that value.

### URL override

```bash
SPINE_WALKER_URL='https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr' bash scripts/assert-spine-walker.sh
```

Stdout is one line per case: `N PASS …` or `N FAIL …` plus the adjacent beat on FAIL.

Optional: `SPINE_WALKER_ONLY=1,8` runs a subset. Each case uses a fresh browser context and clicks **Start over**.

## Locked cases (assert only)

1. 20 on a known price → down and loan write, Use this once.
2. Price 500000 then 1000000 → conflict → Down payment → 20 → Use this → 100000 / 400000, no second conflict.
3. No Not sure on price, down, or loan. “I don’t know” restores the same ask.
4. 97535 → California only → 94123 writes and prices → next is income, not ZIP.
5. First statement Use this → second offered → Skip → contract.
6. Skip ID. Skip stated debts. File still moves.
7. 2–4 asks rent. Skip rent allowed.
8. Mid-ask sideways question. Answer, then the same next chip.

FAIL if copy and chips disagree. FAIL if Structure and chat disagree. FAIL if a write did not kill the old number.
