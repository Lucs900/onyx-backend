# 50 staff hub — already-open desk refresh

**Status:** OPEN FAIL `847940e` → build on PR #18 → tip READY → founder paperclip ACCEPT  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## PASS keep (do not regress)
- Grid PASS on file `afdb0ecf-a55d-4234-82f2-47e878fd14c2` (or fresh mid-file File): HELOC · Primary · Value $500,000 · Lien — · empty cells — · Loud one strip.
- Send writes borrower foxLine (e.g. “I still need the balance on the first lien.”). Hub thread shows it.
- Open /start from hub shows foxLine under first-lien ask · pad $500k.
- Fresh /start PASS.
- Consumer desk product path unchanged except this refresh paint.

## FAIL hole (closed)
Already-open InPrivate desk, refreshed after staff Send, still ended on the first-lien question. Staff sentence not there. Founder leftover from hub v0 ACCEPT — “refresh old tab no paint; Open /start did.” — is now the FAIL lock.

## Root
`/start` refresh hydrated `onyx.foxIntake.draft` / `onyx.fox.messages` from this tab only. Hub Send persists the foxLine on the File. Hub → Open /start reused the hub tab’s already-resumed snapshot. An already-open desk never GET `/api/account`.

## Lock
A desk the borrower already has open must show the new foxLine after refresh. Do not make them open /start from the hub.

## Fix
`linkedAccountRefreshQuery` + `resumeAccountFromQuery` on `/start` boot when a session token or `fileId` is present. Refresh rehydrates thread/foxLine from the File. `beginAccountResume` blocks a stale local persist before the GET returns.

## Accept walk (all four required)
1. Grid still PASS.
2. Send foxLine from hub.
3. Fresh /start shows it.
4. Already-open InPrivate desk → refresh → same foxLine (no Open-from-hub required).

## Keep closed
`0c9950e` · `374e893` · `d0358f2` · `8ae44d9` · `8fa7382` · `4cc75b7`  
No 1040. Phone parked. No holding page.

## Tip
New SHA + public-host READY proof. READY ≠ ACCEPT. Preview only. Do not merge.
