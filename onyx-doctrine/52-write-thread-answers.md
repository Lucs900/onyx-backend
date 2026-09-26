# 52 — write thread answers to the File

**Status:** READY `ac6190c` / `dpl_3AZJR9koYooVMxGPLXfh4Y672hdn` — not ACCEPT.  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Hole
The File thread already had client answers 400,000 · 50,000 · House · 760+ · 94123 · This one · Just me, and Fox quoted 8.80% / $367. The Live file and hub grid still showed Lien — · Line — · Credit —.

## Present on the File (verified)
All of those client lines are in the stored messages (not only the short hub drawer from 51). None were fabricated.

## Root
Persist from ticket 50 kept staff foxLines (append-only) but **replaced the draft**. A thinner same-file snapshot (HELOC · Primary · $500,000) overwrote Lien / Line / Credit. `shouldKeepLiveAccountDraft` only blocks an empty guest draft, not a mid-file thin one. GET/resume then painted that thin draft. Hub also skipped GET when `file_id` already matched, so a stale hub tab stayed empty after the File was repaired.

## Fix
- `writeThreadAnswersToFile` fills empty slots only from client answers that follow the matching fox ask. No name. No invented values.
- `mergeFileDraft` on persist keeps filled pad facts when a stale tab writes a thinner draft.
- GET / resume apply the thread write and save the File.
- Hub always resumes `?file=` so refresh paints server state.

Layout `bbb8cdf` unchanged.

## Accept walk (held)
Refresh hub and desk on https://start.onyxdirect.com:

Hub + desk: Lien $400,000 · Line $50,000 · FICO/Credit 760+ · Rate 8.80% · IO $367 · LTV 80% · CLTV 90% · Count 1 · B1 — · QI — · Value $500,000. No re-ask for those. Desk F5 still paints server state.

## Keep closed
`c004c1f` · `bbb8cdf` layout · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked.

## Tip
SHA `ac6190c` · `dpl_3AZJR9koYooVMxGPLXfh4Y672hdn`  
Hub: https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Desk: https://start.onyxdirect.com/start?path=acr  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
