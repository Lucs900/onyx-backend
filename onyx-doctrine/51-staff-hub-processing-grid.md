# 51 — staff hub processing grid

**Status:** OPEN  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Hole
`/staff/hub` is still a transcript plus the Desk form. The TOP is the 50 identity / loud / quiet strip, not one processing grid.

## Lock
Replace the TOP of `/staff/hub` with ONE processing grid. Short labels. Every slot shows. Empty = `—` (em dash). Never hide an empty slot.

Filled values come from the File / pad and must match `/start` pad.

Thread + foxLine stay UNDER the grid, not instead of it. Send still writes the next borrower foxLine.

Do NOT restyle `/start`. Consumer desk stays unchanged.

Refresh lock `c004c1f` stays closed: already-open desk F5 paints server foxLines; `/start` no-store; staff foxLines append-only.

## Slots, by row (exact labels)
1. Product · Purpose · Occ
2. Value · Lien · Line
3. LTV · CLTV
4. Rate · IO
5. B1 · B2 · Count
6. QI · FICO
7. Status · Next · Waiting

18 cells. Count only when who-on-loan is settled; otherwise `—`. B1 / B2 from pad names. Waiting from `waitingOnOf`.

## Accept walk
On https://start.onyxdirect.com, file `afdb0ecf-a55d-4234-82f2-47e878fd14c2`:

1. `/staff/hub?file=afdb0ecf-…` grid at top shows Product HELOC · Occ Primary · Value $500,000 · Lien, Line, Rate, IO, QI, FICO all `—`. Every slot label visible.
2. Thread under the grid still ends on “The first-lien statement is the one I need.” Restore/verify. No test tokens.
3. Desk tab already open on `/start?path=acr` first. Hub Send one new foxLine (real borrower wording, no test tokens). F5 that same already-open desk tab: the new line is last, pad stays $500,000.

## Keep closed
`c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked.

## Tip
SHA + deployment id + hub + desk URLs + walk result + screenshots (hub grid top; desk after F5) + short video under `/opt/cursor/artifacts`. READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
