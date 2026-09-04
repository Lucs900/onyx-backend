# Spine walker

Playwright walk of the eight locked preview cases. Not a product slice. Hard **Start over** each case. A handwritten walk is not PASS.

## Preview

https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr

## How Manager runs it

From the repo root, on this preview branch:

```bash
bash scripts/assert-spine-walker.sh
```

Override the start URL only if needed:

```bash
SPINE_WALKER_URL='https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr' bash scripts/assert-spine-walker.sh
```

If the preview is behind Vercel Authentication / SSO, set one of:

- `VERCEL_AUTOMATION_BYPASS_SECRET` — sent as `x-vercel-protection-bypass` plus `x-vercel-set-bypass-cookie`
- `VERCEL_OIDC_TOKEN` — sent as `x-vercel-trusted-oidc-idp-token` (same pattern as the access-protected-vercel skill)

A repo-root `.env.local` is sourced automatically. Do not commit it.

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
