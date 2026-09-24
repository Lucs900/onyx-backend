# 55 — Pack Value, Lien, Line, LTV, CLTV into one row

**Status:** OPEN — not READY. READY ≠ ACCEPT.  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Hole
Those five cells take two rows: Value · Lien · Line and LTV · CLTV (`bbb8cdf`).

## Lock
One row of five, in this order: Value · Lien · Line · LTV · CLTV. Same card style. Keep “Estimated · not final” on LTV / CLTV. Founder authorized changing **only those two** `bbb8cdf` rows. Every other row stays. ZIP · Type · Income · Debts stay on the bottom row (`ccce44c`). Do not change numbers. Do not move other cards. Do not touch `/start`. Desktop stays one row. Narrow window must not overflow or clip.

## Accept walk
Refresh https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
One row: Value $500,000 · Lien $400,000 · Line $50,000 · LTV 80.0% · CLTV 90.0%. Other rows unchanged.

## Keep closed
`ccce44c` · `5def8ba` · `ac6190c` · `bbb8cdf` (except these two rows) · `c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked. Rate sentence parked. “This File is yours.” 3x parked.

## Tip
SHA · dpl · walk. READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
