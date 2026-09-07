# Spine walker

Playwright walk of the thirteen locked preview cases. Not a product slice. Hard **Start over** each case. A handwritten walk is not PASS. A Manager PASS with a red walker is FAIL. Case 9 also runs `scripts/assert-harbor-acceptance-file.ts`. Cases 10–13 also run the Lukasz Harbor leftovers (`assert-contract-at-price`, `assert-house-credit-band`, `assert-w2-stub-employment-merge`, `assert-file-next-ask`) from the spine-walker script before Playwright. CI fail = red.

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

Optional: `SPINE_WALKER_ONLY=1,8` runs a subset. One preview session. Each case waits for the File draft, then clicks **Start over** on the live desk (`button.fox-bar__start-over` must stay on screen after case 1). Do not reload after the first open — later navigations hit Vercel SSO.

Harbor extract POSTs are replayed from the same `sample-docs` PDF through Playwright’s API request so OIDC carries the file bytes. The paperclip UI path stays. FICO skip (case 11) is not accepted until cases 10–13 are green on the same tip.

## Locked cases (assert only)

1. 20 on a known price → down and loan write, Use this once.
2. Price 500000 then 1000000 → conflict → Down payment → 20 → Use this → 100000 / 400000, no second conflict.
3. No Not sure on price, down, or loan. “I don’t know” restores the same ask.
4. 97535 → California only → 94123 writes and prices → next is income, not ZIP.
5. First statement Use this → second offered → Skip → contract.
6. Skip ID. Skip stated debts. File still moves.
7. 2–4 asks rent. Skip rent allowed.
8. Mid-ask sideways question. Answer, then the same next chip.
9. harbor-both-cover-contract. Both → years 2 → debts Skip → composer-drop 03, 07, 01, 10, 19, 05, `09-purchase-contract-88-clipper.pdf`. One Harbor Employment row. Combined wage + Schedule C. Cover 19 maps K-1 / 1065 / Sch E. Clipper 94114, Filbert stays residence. Looks right hidden while Use this is open. No citizenship after Looks right.
10. 09 at the price ask. Confirm once. Use this writes Clipper / $850,000 / close / seller credit. Next is funds. No second price ask. No On the file.
11. On the House turn, type 740–759. Credit writes on Structure. Next Fox line is not the FICO ask.
12. 03+07 before income type. No empty income quiz.
13. Start over clears income, Docs, Note, Still useful.

FAIL if copy and chips disagree. FAIL if Structure and chat disagree. FAIL if a write did not kill the old number. FAIL if Credit is on File and Fox asks FICO.
