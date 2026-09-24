# 50 staff hub — already-open desk refresh

**Status:** FAIL `0e7ab51` → build on PR #18 → tip READY → founder paperclip ACCEPT  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## PASS keep (do not regress)
- Grid PASS on file `afdb0ecf-a55d-4234-82f2-47e878fd14c2` (or fresh mid-file File): HELOC · Primary · Value $500,000 · Lien — · empty cells — · Loud one strip.
- Send writes borrower foxLine. Hub thread shows it.
- Open /start from hub shows foxLine under first-lien ask · pad $500k.
- Fresh /start PASS.
- Consumer desk product path unchanged except this refresh paint.

## FAIL `0e7ab51`
Founder: same InPrivate window, file `afdb0ecf-…`. Hub Send “Please send the first-lien balance when you can.” Open /start from hub paints it. The desk tab that was **already open**, F5, still ends on the first-lien question with **no** staff lines.

## Root (verified)
The File on the server already had the staff lines. Fresh /start and Open-from-hub GET/reuse a resumed snapshot, so they paint. The already-open tab sits on clean `/start?path=acr` after sign-in. That tab’s local thread is the pre-Send first-lien ask.

`0e7ab51` merged on persist (so a stale `pagehide` should not wipe the File) and rehydrated only when the **new** bundle ran. A tab opened before that deploy can F5 a cached `/start` document and keep the old hydrate (localStorage only). Prompt-sync can also reprint the first-lien ask over a staff foxLine. Walk-test sentences were left on the File.

## Lock
Refreshing an already-open `/start` must paint the server foxLines for this `file_id`. A new Open /start is not the fix. Sequence: desk tab open **first**, Send from hub, F5 on that **same** tab. No new tab. No Open-from-hub. F5 twice more and close/reopen hub — staff line survives. No walk-test lines.

## Fix
- `/start` is `force-dynamic` + `Cache-Control: no-store` so F5 loads the live bundle.
- `pageshow` (bfcache) and boot rehydrate from the File (`token` or `fileId`), `fetch` `cache: "no-store"`.
- Persist: staff foxLines are append-only (id + `staff-desk` fact/event). Stale desk writes cannot drop them.
- `pagehide` persist is skipped while rehydrate is pending.
- Prompt-sync treats a staff-desk foxLine as owning the prompt.
- GET/persist strip walk-test lines (`Refresh must paint…`, `(mufw…)`).

## Accept walk (required)
1. Grid still PASS.
2. Open desk tab first (InPrivate, signed-in File) and leave it open.
3. Send a staff foxLine from hub in another tab.
4. F5 that same already-open desk tab → staff line painted · pad $500k.
5. F5 twice more; close/reopen hub — staff line survives.
6. Borrower thread has no test lines.

## Keep closed
`847940e` grid · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9` · `8fa7382` · `4cc75b7`  
No 1040. Phone parked. No holding page.

## Tip
New SHA + public-host READY proof. READY ≠ ACCEPT. Preview only. Do not merge.
