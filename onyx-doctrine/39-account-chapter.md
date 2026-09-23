# Account chapter (22 Sep 2026)

## Status
READY preview. Do not merge. READY ≠ ACCEPT. Walker-green ≠ founder-green. Do not call ACCEPT.

## Why
After hub v0 spine, the File must follow the person across browsers via account — not “this device.” Invite-only is only a side door.

## Lock
- Account can start on the first question, not only after Proceed.
- First-question chips: **Create account · Log in · Not now**. Product chips stay Buy · Refinance · HELOC · Jumbo · Other. Nav Log in alone is not enough.
- Create account Fox (exact): “So this File can find you on another phone — not stuck in this tab.” Then Email / Phone / Not now.
- After Email Fox (exact): “Where should I send the sign-in link?” Composer is the address. Not now = changed my mind, not the only chip.
- Log in Fox (exact): “Welcome back. Email or phone for a code?” Same File.
- Email magic link or phone code. Same person, same `file_id` on a second browser. Homepage `/start` resumes that File.
- Magic-link origin is the host that handled create (request Origin / Host). Never `NEXT_PUBLIC_APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `onyx-backend-ten` over that request.
- Desk-letter URL (email only) appends `x-vercel-protection-bypass` from `VERCEL_AUTOMATION_BYPASS_SECRET` so InPrivate opens `/start?account=…` with no Vercel account. Snapshot `magicLink` stays `/start?account=` without the query. Never speak the query, the secret, or the token.
- **Never print the token, `/start?account=…`, the bypass query, or the raw code in the borrower thread.** Fox says check your email / enter the code.
- Real send: Resend (`RESEND_API_KEY`, `RESEND_FROM` on an ONYX domain) or Twilio. Fox says check your email **only when send succeeded**. If the mailer is dark or fails, Fox says it couldn’t send — never a token, never a lie.
- After Email, chips are **Phone · Not now**. Composer is the address. Not now is not the only chip.
- Hub opens that `file_id`. foxLine already on the File is the next line when they return.
- Proceed with no account is **not** `in_queue`. One save ask + pad **Save this File**. With an account, Proceed still reaches `in_queue`.
- Not now still allowed (browser sketch).
- No Google-required. No SSN login. No BNTouch as source of truth. No public domain cutover. No invite-reward.

## Preview hooks (no secrets)
- Quiet chips on the first question: **Create account · Log in · Not now**.
- Email → Fox: check your email. Open the link from the mailer on another browser.
- Phone → Fox: enter the code. Type the 6-digit code. Do not paste `/start?account=…` into chat.
- `/login` is the same desk resume, not a second product.
- Bypass: OIDC / `vercel curl` — `x-vercel-trusted-oidc-idp-token: $VERCEL_OIDC_TOKEN`. Never set-bypass-cookie.

## READY preview env
If the unique READY preview has no mail provider, set on the Vercel preview:
- `RESEND_API_KEY`
- `RESEND_FROM` (e.g. `ONYX <noreply@…>`)
- Phone: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- Letter InPrivate: `VERCEL_AUTOMATION_BYPASS_SECRET` (Protection Bypass for Automation). Query on the letter URL only. Never set-bypass-cookie.

## Keep closed
4cc75b7 hub v0 spine, f896f95 Skip-on-name, b680d6a account spine (first-question / email / token resume / Not now), and prior File-honest locks (`1129e4b` / `529259d` / `0771262` / …).

## Out of this SHA
Dense 1008, holding-page publish, referral cash, credit pull / lock desk, Google-required login, SSN login, BNTouch / public-domain cutover.

## Accept bar
1. First screen huge: Buy · Refinance · HELOC · Jumbo · Other. Quiet: Create account · Log in · Not now
2. Create account → “So this File can find you on another phone — not stuck in this tab.” → Email / Phone / Not now
3. Email → “Where should I send the sign-in link?” → type address in composer → real email sent (not stub URL in thread)
3b. Log in → “Welcome back. Email or phone for a code?” Same File
4. InPrivate / second browser opens the letter with no Vercel login → same `file_id` · notepad + last Fox line match
5. Sketch: Not now → finish → Proceed with no account → one save ask + pad Save this File; not `in_queue` until saved/accounted
6. With account, Proceed still reaches `in_queue`

Tip SHA + unique READY `/start?path=acr` + branch alias + Vercel inspector + GitHub deployment id. READY ≠ ACCEPT. Do not call ACCEPT.
