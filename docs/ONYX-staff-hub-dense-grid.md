# Staff hub — dense 1008 grid (one pass)
2026-09-22. Design Scout → ONYX Manager → Code Builder tip.
Preview only. Spine `4cc75b7` stays closed. Do not merge. Not consumer Fox. No holding. No /start.

Founder ADD on hub v0: one staff grid, complete even when empty. Short acronyms. Point-density.

---

## Grid structure (sections)

Desktop staff canvas. Same three bands as hub v0. Thread stays a drawer. DESK composer unchanged (condition · foxLine · finish chips from spine).

### LOUD — deal grid (top)
Fixed cell shells. Never collapse. Two rows:

**Row A — identity (4 cells)**  
`PROD` · `PURP` · `OCC` · `BORS`

**Row B — money + quote (8 cells)**  
`VAL` · `1ST` · `LINE` · `LTV` · `CLTV` · `RATE` · `IO` · `FICO`

Loud numbers stay tabular / huge on VAL · 1ST · LINE · LTV · CLTV · RATE. Labels are the short acronyms above the value.

### PAY — income row (middle, quieter)
**Row C (2 cells, wider)**  
`QI` · `DEBT`

QI cell shows method under the number when present (W-2 / stub / Sch C / K-1 / rental). Label stays `QI`.

### STATE — pulse row (quiet)
**Row D (2 cells)**  
`STAT` · `NEXT`

Under Row D, a single quiet flag strip (see below). Completeness may sit as a whisper under STAT (`sketch · N of Y`) — not a gate, not a progress wall.

### DESK — bottom (unchanged)
Condition (staff-only) · foxLine · Send / finish chips from spine. No lock. No AU. No SSN.

---

## Exact short acronym labels (KEEP map)

| KEEP cell | Acronym | Notes |
|---|---|---|
| Product | `PROD` | Buy / Refi / HELOC / Jumbo / Other |
| Purpose | `PURP` | Purchase / Cash-out / Rate-term / etc. |
| Occupancy | `OCC` | Primary / Second / Investment |
| Value | `VAL` | Subject value |
| 1st lien | `1ST` | First mortgage balance / amount |
| Line | `LINE` | HELOC line (or Loan / Down when that is the File truth) |
| LTV | `LTV` | |
| CLTV | `CLTV` | |
| Rate | `RATE` | Sample/indicative rules unchanged; not a lock |
| IO | `IO` | IO or P&I short mark |
| FICO band | `FICO` | Band only · Stated · not a pull |
| Borrowers | `BORS` | Count + short names when known |
| QI + method | `QI` | Number + method subline |
| Stated debts | `DEBT` | Stated · not from credit |
| Status | `STAT` | File status |
| Next | `NEXT` | Next action / waiting-on short |

Do not invent cells. Do not add SSN, AU, lock, reward %.

---

## Empty cells

- Shell always renders. Acronym label stays visible.
- Value slot = muted em dash `—` (same weight as empty Structure lines).
- Do not hide the cell. Do not stretch neighbors to fill. Completeness is not a gate — empty is honest.

---

## Quiet flags (true only)

Sit in a single strip **under Row D (STATE)**, left-aligned. Invisible when false. No empty flag chips.

| Flag (when true) | Short mark |
|---|---|
| investment | `INV` |
| high-LTV-MI | `HI-MI` |
| cash-out | `C/O` |
| rental review | `RENT` |

Max density: flags are text pills, quieter than STAT/NEXT. Never invent flags not on File.

---

## Tip shape for Code Builder (one ticket)

Build dense staff grid shells on hub v0 canvas: Rows A–D with acronyms above; empty = `—`; quiet flag strip under STATE; DESK unchanged. Preview branch only. Spine closed. No merge. No consumer Fox changes.
