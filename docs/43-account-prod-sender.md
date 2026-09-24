# Production sender + cookie-less resume host (23 Sep 2026)

## Status
ACCEPT `start.onyxdirect.com` resume host (founder paperclip). Preview only. Do not merge.
`575fee8` letter-on-preview stays locked as the workshop (protection-bypass) path. OPEN: post-link desk line (44-post-link-desk-line.md).

### Founder pick (23 Sep 2026) — unlock after 6fdb71e
- **Resume host:** `start.onyxdirect.com` (do not invent a second host).
- **ACCOUNT_RESUME_ORIGIN** = `https://start.onyxdirect.com`
- Borrower letter **Open your desk** lands on `https://start.onyxdirect.com/start?path=acr`
- No protection-bypass on the borrower link. No Vercel login in InPrivate.
- Unique preview (`ale1xgcx5` and souvenirs) stays Deployment Protected. Borrower never sees that URL.
- Do **not** cut over `onyxdirect.com` homepage — Aero stays until founder says cutover.
- Do **not** disable Deployment Protection on unique.
- DNS: GoDaddy on `onyxdirect.com`. One host only.

### GoDaddy CNAME (founder adds — one host)
Zone: `onyxdirect.com` (ns49/ns50.domaincontrol.com). Do not change apex / `www` (Aero stays).

| Field | Value |
| --- | --- |
| **Type** | `CNAME` |
| **Name** | `start` |
| **Target** | `cname.vercel-dns.com` |
| **TTL** | default (or 600) |

GoDaddy UI: Host `start` (not `start.onyxdirect.com`). Target `cname.vercel-dns.com` (no `https://`).

Vercel project: **onyx-direct / onyx-backend**. Add domain `start.onyxdirect.com`. Assign to git branch `cursor/live-rateflow-preview-bc93` — **not** Production (main has no `/start`). Unprotect **only** this host (Deployment Protection Exception). Unique souvenirs stay protected.

If the Vercel domain card later shows a project-specific target (`xxxxxxxx.vercel-dns-017.com`), use that card’s target instead of `cname.vercel-dns.com`.

### 6fdb71e (NOT READY — superseded as unlock, keep as history)
- Create-host: https://onyx-backend-ale1xgcx5-onyx-direct.vercel.app/start?path=acr
- Code shape present; blocker was missing public cookie-less desk host + ACCOUNT_RESUME_ORIGIN.

## Why
Borrower Create account on the first Save wall must deliver a real magic link and resume the same File in InPrivate without a Vercel login wall or protection-bypass on the link they tap.

## Locked targets (this SHA)
- **From:** ONYX Direct &lt;lucas@onyxdirect.com&gt;
- **Subject:** Your ONYX File
- Create account on first Save wall delivers the magic link.
- No `account=` token in the Fox thread.
- InPrivate Open your desk: same File, Fox + pad, no Vercel login wall, **no protection-bypass required** on the borrower-tapped link.
- Resume host = `start.onyxdirect.com` → clean `/start?path=acr` — not a raw `vercel.app` preview souvenir URL.
- ACCOUNT_RESUME_ORIGIN = `https://start.onyxdirect.com`

## Keep (do not rewrite)
- Design door copy · Save why-sentence (`d0dd8ed`) · Fox chips (`97e6b9b`) · pad Save only (`f845741`)
- No intelligence rewrite · No hub work

## Keep closed
`f845741` pad · `d0dd8ed` why · `97e6b9b` chips · `8fa7382` · `4cc75b7` · `575fee8` letter-on-preview

## Out of this SHA
Header Log in / Start your relationship leftover · holding page · dense grid · onyxdirect.com homepage cutover

## Accept bar (founder paperclip)
1. HELOC 500 / 400 / 50 → Proceed → Create account → email `lucas@onyxlending.com`.
2. Letter: From ONYX Direct &lt;lucas@onyxdirect.com&gt; · Subject Your ONYX File · no token spoken in Fox thread.
3. InPrivate tap Open your desk → `https://start.onyxdirect.com/start?path=acr` → same File · Fox + pad · gathering or preparing · line `$50k` / `$367`.
4. Link needs no protection-bypass; no Vercel login wall; borrower never sees unique souvenir URL.

FAIL if: stub sender; token in thread; InPrivate Vercel login; bypass required on borrower link; raw preview souvenir host; chips/why/pad rewritten; homepage cut over; unique protection disabled.
