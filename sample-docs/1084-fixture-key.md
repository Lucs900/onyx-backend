# ONYX 1084 tax fixtures

Sample worksheets for extract + income-module walks. Not IRS forms. Not underwritten.

Borrower: Jordan Hale. Residence: 412 Filbert Street, San Francisco, CA 94123. No SSN. No account numbers.

## What Fox may do today vs later

v1 locked SE module (do not break):
- Schedule C: net + depreciation + depletion + home office − identifiable nonrecurring, /12
- Two years: average unless later year is lower
- K-1: ordinary /12 only, label Ordinary is not confirmed cash flow
- Confirm before write. Suggested · not underwritten

These fixtures also print the extra 1084 lines so the next income-module slice can be proven without guessing:
- Line 24b meals
- Amortization
- Guaranteed payments
- K-1 rental boxes
- Notes payable < 1 year
- Non-deductible T&E
- Distributions (liquidity only)
- S-corp W-2 (separate wage row)
- Schedule E rental
- Schedule F
- 1040 cover (classifier must not stop)

## Schedule C — Hale Design Studio

Method for the printed “expected 1084” box:
Line 31 − Line 6 nonrecurring + Line 12 + Line 13 + Line 30 + Part V amort − Line 24b.

| File | Year | Line 31 net | L6 NR | L12 | L13 dep | L24b | L30 home | Amort | Expected annual | /12 |
|---|---|---|---|---|---|---|---|---|---|---|
| 10-1040-schedule-c-2024-hale-design.pdf | 2024 | 88,000 | 4,000 | 500 | 12,000 | 2,000 | 3,000 | 1,200 | 98,700 | 8,225 |
| 11-1040-schedule-c-2025-hale-design.pdf | 2025 rising | 108,000 | 4,000 | 500 | 12,000 | 2,000 | 3,000 | 1,200 | 118,700 | 9,892 |
| 12-1040-schedule-c-2025-hale-design-declining.pdf | 2025 declining | 72,000 | 4,000 | 500 | 12,000 | 2,000 | 3,000 | 1,200 | 82,700 | 6,892 |

v1 module if it still ignores meals and amort:
- 2024: 88,000 − 4,000 + 500 + 12,000 + 3,000 = 99,500 → $8,292
- 2025 rising: 119,500 → $9,958
- 2025 declining: 83,500 → $6,958

Two-year: average unless later year is lower. Declining pair uses 2025 only and names the decline.

## K-1 1065 — Bay Street Partners LLC · 40% (already applied)

| File | Year | Box 1 | Box 2 | Box 3 | Box 4c GP | Dist 19 | Dep | Depl | Amort | Notes <1yr | T&E | NR other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 13-k1-1065-2024-bay-street.pdf | 2024 | 40,000 | 2,000 | 0 | 18,000 | 35,000 | 6,000 | 0 | 800 | 0 | 400 | 0 |
| 14-k1-1065-2025-bay-street.pdf | 2025 | 44,000 | 2,200 | 0 | 18,000 | 38,000 | 6,000 | 0 | 800 | 0 | 400 | 0 |

v1 suggest: Box 1 / 12 only → 2024 $3,333 · 2025 $3,667.
Full 1084 before liquidity: ordinary + rental + GP + dep + amort − T&E.
2024: 40,000 + 2,000 + 18,000 + 6,000 + 800 − 400 = 66,400 → $5,533.

## K-1 1120S — Harbor Studio Inc · 100%

| File | Year | Box 1 | Box 2 | Dist | S-corp W-2 | Dep | Notes <1yr | T&E | NR |
|---|---|---|---|---|---|---|---|---|---|
| 15-k1-1120s-2024-harbor-studio.pdf | 2024 | 48,000 | 0 | 40,000 | 36,000 | 8,000 | 0 | 600 | 0 |
| 16-k1-1120s-2025-harbor-studio.pdf | 2025 | 52,000 | 0 | 44,000 | 36,000 | 8,000 | 0 | 600 | 0 |

v1 suggest: Box 1 / 12 → 2024 $4,000 · 2025 $4,333.
W-2 $36,000 is wage. Combined names both methods. Do not fold W-2 into K-1.

## Other

- 17-schedule-e-2025-sanchez-rental.pdf — 2 units, rents 42,000. Other property, not Clipper.
- 18-schedule-f-2025-hale-farm.pdf — classify as farm. Thin.
- 19-1040-cover-2024-jordan-hale.pdf / 20-1040-cover-2025-jordan-hale.pdf — pointers only.

## Walk rules for Manager

1. Composer-drop. Hard Start over. Not a /workspace fixture read.
2. Confirm-before-write. File empty until Use this.
3. Wrong class that writes the wrong schema fails.
4. Unreadable invents nothing.
5. Do not ask Lukasz for real tax returns.
