# HELOC tool prime source (19 Sep 2026)

## Status
READY preview. Do not merge. READY ≠ ACCEPT. Walker-green ≠ founder-green.

## Why
`calculateHelocQuote` added margin to a hardcoded 6.75. Founder flagged 3.75 / 4.00 as fed funds, not prime. WSJ / Fed H.15 prime was 7.00% effective 2026-09-17.

## Lock
- Index is `WSJ_H15_PRIME` (7.00). Not fed funds 3.75 / 4.00. Not 6.75.
- Margin table + 0.80 compensation stay. Do not invent a new margin.
- Speech stays This HELOC right now / estimated interest-only. Rateflow off HELOC.
- CLTV cap 90% Primary House stays. 100% still no This one.

## Keep closed
6832179 CLTV, 1389615 finish, e98358e speech shape, 986e8fd who-on-loan, cash-out, ZIP.
