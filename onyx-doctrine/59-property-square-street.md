# 59 — Street cell inside the Property square

**Status:** READY `e49b1ec`. Preview only. Do not merge. READY ≠ ACCEPT.  
**Date:** 2026-09-25  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Add
One cell inside the Property square on `/staff/hub`:

- Street — the street already saved on this File

Paint only if the File already stores a street. If the only saved location is ZIP 94123, show —. Never copy the ZIP into this cell. Do not geocode. Do not invent.

## Do not
- Ask again (no new Fox question).
- Invent a street or copy ZIP 94123 into Street.
- ZIP lookup / geocode / Places reverse lookup.
- Touch `/start`.
- Move or change the other five squares.
- Shrink the wide Email cell (`9143dd2`).
- Add a second Need. Pay stub stays off.

## Wrap lock
One line, or a break only at a comma or a space. Never inside a word.
Same approach as 58 Email: `<wbr>` after each comma and space. `overflow-wrap: normal` · `word-break: normal`. Street cell may span two columns.

## Accept walk
Refresh https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Property shows Street and the saved line, or —. Product · Purpose · Occ · Type · ZIP stay. Other five unchanged. Fox asked nothing new.

## Keep closed
`9143dd2` · `e18c694` · `f3ad1db` · `b2c2e6e` · `ccce44c` · `5def8ba` · `ac6190c` · `c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked. Rate sentence parked. Pay stub stays off Need.

## Street storage source
Not a SQL table. Vercel Blob object `account/file/afdb0ecf-a55d-4234-82f2-47e878fd14c2.json`.  
Checked top-level keys (`email`, `fileId`, `accountId`, `draft`, `messages`) and `draft` plus `draft.facts`.  
`draft.subjectAddress` is absent. `draft.facts.property_address` is absent. `draft.facts.present_address` is absent. `draft.pendingAddress` is null. Documents: none.  
Only saved location: `draft.propertyZip` = `94123`. Thread: Fox asked address or ZIP; client answered `94123`.  
Street paints `—`. ZIP was not copied. No geocode.

## Tip
SHA `e49b1ec` · `dpl_DgZTcgz7R1C6HXUm5Ku1wU1e9aYg`  
Hub: https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Paint source when a street exists: `draft.subjectAddress` (confirmed `draft.facts.property_address` via `displayedSubjectAddress`). Never ZIP.  
Wrap: `<wbr>` after comma or space · `.staff-hub-cell__value--street { overflow-wrap: normal; word-break: normal }` · cell `grid-column: span 2` when a street is present.  
This File: Street `—`. Email 2-column stays.  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
