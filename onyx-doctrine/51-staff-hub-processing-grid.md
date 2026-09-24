# 51 — staff hub processing grid

**Status:** READY `bbb8cdf` / `dpl_5JwhfUJ7E1NaohQTuNEdNtUcKMmx` — not ACCEPT.  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Hole
`/staff/hub` was still a transcript plus the Desk form. The TOP was the 50 identity / loud / quiet strip.

## Lock
Replace the TOP of `/staff/hub` with ONE processing grid. Short labels. Every slot shows. Empty = `—`. Never hide an empty slot. Values from the File / pad (same as `/start`). Thread + foxLine stay UNDER the grid. Send still writes the next borrower foxLine. Do NOT restyle `/start`. Refresh lock `c004c1f` stays closed.

## Slots, by row (exact labels)
1. Product · Purpose · Occ
2. Value · Lien · Line
3. LTV · CLTV
4. Rate · IO
5. B1 · B2 · Count
6. QI · FICO
7. Status · Next · Waiting

## Root / what changed
`hubGridRows` is 18 cells. Occupancy → Occ. Borrowers → B1 / B2 / Count (Count only after who-on-loan). Waiting is its own slot. `ProcessingHub` paints one `staff-hub-grid--processing` at the top; thread + Desk stay under it. Hub CSS only. Consumer `/start` untouched.

## Accept walk (held)
On https://start.onyxdirect.com, file `afdb0ecf-a55d-4234-82f2-47e878fd14c2`:

1. Hub grid at top: Product HELOC · Purpose HELOC · Occ Primary · Value $500,000 · Lien, Line, Rate, IO, QI, FICO all `—` · every slot label visible (18).
2. First hub open ended on “The first-lien statement is the one I need.” No test tokens.
3. Desk tab open first on `/start?path=acr`. Hub Send “Please send the first-lien statement when you can.” F5 that same tab → new line last · pad $500,000.

## Keep closed
`c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked.

## Tip
SHA `bbb8cdf` · `dpl_5JwhfUJ7E1NaohQTuNEdNtUcKMmx`  
Hub: https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Desk: https://start.onyxdirect.com/start?path=acr  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
