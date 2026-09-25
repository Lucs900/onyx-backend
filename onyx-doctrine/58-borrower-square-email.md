# 58 — Email cell inside the Borrower square

**Status:** FAIL `ec2f00d` — Email broke inside words. OPEN wrap fix. Preview only. Do not merge.  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Add
One cell inside the Borrower square on `/staff/hub`:

- Email — the address already saved on this File

Paint only if the File already stores it. If none, show —. Do not invent an address. Count, B1, B2, FICO stay. Collateral, Price, Property, Income, File do not change. Need stays Last year’s W-2 only (pay stub stays off).

## Do not
- Ask again (no new Fox question).
- Invent an address.
- Touch `/start`.
- Move or change the other five squares.
- Add a second Need.

## FAIL `ec2f00d`
Email painted `lucas@onyxlending.com` as `lucas@ony / xlending.co / m` (broken inside words). Cause: `.staff-hub-cell__value { overflow-wrap: anywhere }`.

## Wrap lock
Same stored address. Do not invent. Do not use `draft.contact.email`.
Read `lucas@onyxlending.com` on one line, or break ONLY right after `@` or after a dot. Never inside a word.
No `word-break: break-all`. No `overflow-wrap: anywhere` / `break-word` on that value.
`<wbr>` after `@` and after each dot. `overflow-wrap: normal` · `word-break: normal`. Email cell may span two columns.

## Accept walk
Refresh https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Email reads `lucas@onyxlending.com` with no mid-word break. Count, B1, B2, FICO stay. Other five unchanged. Fox asked nothing new.

## Email storage source
Not a SQL table. Vercel Blob object `account/file/afdb0ecf-a55d-4234-82f2-47e878fd14c2.json`.  
JSON key path: `email` (AccountRecord.email). Stored value: `lucas@onyxlending.com`.  
GET `/api/account?file=` snapshot now exposes that same `email`.  
`draft.contact.email.value` is `""` — not used, not invented, not written.  
Did not scrape the thread.

## Keep closed
`e18c694` · `f3ad1db` · `b2c2e6e` · `ccce44c` · `5def8ba` · `ac6190c` · `c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked. Rate sentence parked. Pay stub stays off Need.

## Tip
SHA `ec2f00d` · `dpl_CYxsg5Tv1dqJxduGScuaHC5swWM6`  
Hub: https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
