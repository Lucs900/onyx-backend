# 60 — Hub QI shows the wage already written on the File

**Status:** READY `e953133`. Preview only. Do not merge. READY ≠ ACCEPT.  
**Date:** 2026-09-25  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `bd087b10-059f-4c02-9d5c-519dfac30e0f`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Add
QI inside the Income square on `/staff/hub` paints the wage already written on this File.

- Stored monthly → `$10,000 / mo`
- Only Box 5 written → `$120,000` and the cell says Box 5 (annual)
- Nothing written → — and READY says exactly `Use this did not write the wage`

## Do not
- Divide in the hub (no /12). Do not invent a monthly.
- Paint a pending suggestion.
- Add a Fox ask. Touch account chips. Touch `/start`.
- Move other squares. Add Pay stub to Need. Change B1 Raymond Lee.

## Keep closed
`e49b1ec` · `9143dd2` · `e18c694` · `f3ad1db` · `b2c2e6e` · `ccce44c` · `5def8ba` · `ac6190c` · `c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked. Rate sentence parked. Pay stub stays off Need.

## Wage storage
Step 1 was done on the live Preview Blob store (`storeReady: true`, same store as `afdb0ecf-a55d-4234-82f2-47e878fd14c2`).

`list({ prefix })` with the project's token:

- `account/file/bd087b10-059f-4c02-9d5c-519dfac30e0f` → 0
- `account/file/` → 30 File objects; none are this id
- `account/` → 61 objects; scanned `account/file/`, `account/email/`, `account/token/`, `account/phone/`, `account/code/` for JSON `fileId === bd087b10` → none
- `fox-intake/` → 4021 docs; none named with this id
- `wageHits` → [] (no stored File has `w2_box5`, `qualifying_income`, or a Raymond name)

There is no stored File JSON. `draft.facts.w2_box5` is not present. `qualifying_income` / monthly keys are not present.

**Use this did not write the wage**

GET `/api/account?file=bd087b10-…` `not_found` is not a wrong key and not a missing device cookie. The route does not use a cookie. The object is not in this store. `afdb0ecf` still 200s at `account/file/afdb0ecf-a55d-4234-82f2-47e878fd14c2.json`. The founder hub that shows B1 Raymond Lee · Income W-2 is the device localStorage File after resume 404.

Hub read now lists prefixes and accepts draft without a token. That lookup is not the miss. The miss is: this File was never persisted.

QI paints — . Miss: no stored wage keys.

## Tip
SHA `e953133` · `dpl_2x9jLVwPFdQ6WDuqJsLjhUAKTR6w`  
Hub: https://start.onyxdirect.com/staff/hub?file=bd087b10-059f-4c02-9d5c-519dfac30e0f  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
