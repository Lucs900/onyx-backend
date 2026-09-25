# 59 — Street cell inside the Property square

**Status:** OPEN. Preview only. Do not merge. READY ≠ ACCEPT.  
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
