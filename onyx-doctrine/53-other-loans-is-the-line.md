# 53 — Other loans is the HELOC line

**Status:** READY `5def8ba` / `dpl_6rqnJ6Tm1UoCZDmTTew3un9rWWpU` — not ACCEPT.  
**Date:** 2026-09-24  
**Host:** https://start.onyxdirect.com only  
**PR:** #18 · branch `cursor/live-rateflow-preview-bc93`  
**file_id:** `afdb0ecf-a55d-4234-82f2-47e878fd14c2`  
**READY ≠ ACCEPT. Preview only. Do not merge.**

## Hole
Desk Live file shows **Other loans on this property $50,000**. That $50,000 is the client answer to “What line do you want available?” and already sits in **HELOC line**. It must not also populate Other loans.

## Lock
- Line-amount answer fills **HELOC line** only.
- Other loans fills only from an **explicit other-liens** answer.
- Clear Other loans to **—** on this File. Do not re-ask.
- Stays: HELOC line $50,000 · Lien $400,000 · CLTV 90% · Value $500,000.
- CLTV stays 90%. Do not count the line twice.

## Root
`calculatorSubordinate` returns the HELOC `loanAmountValue` so CLTV is (first lien + line) / value. That is correct for 90%. `persistLtvCltv` then copied that same number onto `subordinateBalance` / `subordinate_balance`. `calculatorStructureFacts` painted it as “Other loans on this property.” Ticket 52 `writeHelocLine` → `persistLtvCltv` wrote the leak onto this File.

## Fix
- CLTV still uses the line (plus any true other liens).
- Other-loans display and persist use explicit other liens only — never the HELOC line.
- A leftover HELOC `subordinateBalance === loanAmountValue` is the leak and is stripped on write / GET / persist.

## Accept walk (held)
Refresh on https://start.onyxdirect.com. Do not re-ask.

1. Desk https://start.onyxdirect.com/start?path=acr → Other loans **—** · HELOC line **$50,000**.
2. Hub https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2 → Line **$50,000** · CLTV **90%**.

Lien $400,000 · Value $500,000 stay. No second count of the line. GET stripped leftover `subordinateBalance` 50000 on this File.

## Parked — do not touch
“This File is yours.” 3x · Rate sentence on desk pad · “So this File can find you on another phone.”

## Keep closed
`ac6190c` · `bbb8cdf` layout · `c004c1f` · `0e7ab51` · `847940e` · `0c9950e` · `374e893` · `d0358f2` · `8ae44d9`

No 1040. Phone parked.

## Tip
SHA `5def8ba` · `dpl_6rqnJ6Tm1UoCZDmTTew3un9rWWpU`  
Hub: https://start.onyxdirect.com/staff/hub?file=afdb0ecf-a55d-4234-82f2-47e878fd14c2  
Desk: https://start.onyxdirect.com/start?path=acr  
READY ≠ ACCEPT. Do not merge. Do not ACCEPT.
