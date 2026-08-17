# ONYX build manual

Redesigned onyxdirect.com on `cursor/onyx-slice-1-shell-8e97` / PR #2. **Preview only.** Do not merge to `main`, do not promote to production, and do not assign `onyxdirect.com`.

This branch is **not** a continuation of `cursor/onyx-marketing-foundation-f26d` / PR #1. Start from these locked docs, not that foundation.

## Source of truth (locked 15 Aug 2026)

1. [`docs/ONYX-design-direction2.md`](docs/ONYX-design-direction2.md)
2. [`docs/ONYX-homepage-mockup-spec2.md`](docs/ONYX-homepage-mockup-spec2.md)

Later slices must follow those decisions. Do not invent a second palette, IA, or CTA system. Do not invent facts listed as **OPEN**.

## Slice 1 — shell

Tokens, navigation, footer, and layout foundation. Keep this chrome.

## Slice 2 — hero + locked ACR object

Homepage first screen is ACR-first: locked eyebrow / H1 / support, dual CTAs, in-hero broker line, and the locked pictorial ACR card.

The hero object is the exact locked bitmap **`public/acr-card-face.png`**, shown as a clean `<img>`. Do not regenerate, restyle, or color-grade it. Keep it straight (0°). No CSS type overlay, sheen, sweep, filters, or tilt. Type/gold/fox live in the bitmap if present. Only this object may lift (soft shadow).

**Locked — do not reopen** house, zoom, gold width, or composition. Not the old CSS membership pass (no MEMBER, last-4, chip, or ONYX wordmark on the object).

Hero secondary `Just need a mortgage` now switches Slice 3 to Loan mode and scrolls to it.

## Slice 3 — Homepage mode toggle

Centered section under the hero is **page mode only**: `Relationship` | `Loan`. Default **Relationship**. Not a second Fox composer. No centered ask bar, chips-as-chat, or “Ask ONYX Fox” form on the page.

Hero `Just need a mortgage` and rate-card `Find my rate` still switch this toggle to Loan and scroll to it. Fox lives in the central AI bar only.

## Slice 4 — Membership math (The Three Desks)

Section below Advisor Spotlight. Static open cards. No accordion. No icons. No metal.

- Eyebrow: `THE RELATIONSHIP`
- H2: `A relationship that keeps working after close.`
- Do not bring back the `$—+` value-theater headline. Do not invent a dollar amount.
- Body: `Live credit and rate data. Three desks. One relationship.`
- Quiet mark: `Sample, not live`
- Locked names: **The Rate Desk**, **The Credit Path**, **The Member Desk**

## Slice 5 — Rate card + comparison

Below the three desks.

Rate card is the mortgage-without-ACR off-ramp:

- Eyebrow `MORTGAGE ONLY`. No section H2.
- APR / decision / amount / as-of remain **OPEN**. Preview uses `—` and `Sample · not live`. Do not invent a live rate.
- Product line may show `Purchase · 30-year fixed` only as a labeled sample.
- CTA `Find my rate` (56px) with `2 min · no hard credit check` switches Advisor Spotlight to **Loan** mode — same path as hero `Just need a mortgage`.
- Exact line under the card: `A mortgage is available without ACR.`

Comparison: Feature | ONYX ACR | Traditional lender | Loan only. ONYX column uses a 6px metal underline (allowed metal besides fox/card). Member credits ONYX cell: `Calculated membership reward`. Mobile uses stacked cards.

## Slice 6 — How it works + proof + closer

How it works: `THE PATH` / `Get approved. Then stay that way.` Five steps. Emphasize Approve → Optimize → Stay in the desk. Caption under 03: `Loan-only can stop here.`

Proof: four OPEN placeholders (`—`), `Sample · not live`, `As of —`. No invented volume, stars, quotes, or GSE logos. Trust marks: Equal Housing, NMLS Consumer Access, Mortgage broker.

Closer: locked H2 `Always approved. Always optimizing.` Primary → `/acr`. Secondary → Loan Spotlight. `Talk to a licensed originator` + `NMLS ____`. Repeat `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.` Mobile sticky bar is Slice 9, not this slice.

## Product Explorer (CA only)

Route `/products`. California discovery only. No live pricing, APR, LoanSifter, calculators, or apply flows. Thirteen cards in five groups (Core residential, Government, Equity, Expanded residential, Specialty). CTA is exactly `Explore this option` → `/products/scenario?product=<slug>`. Specialty is separated by space + hairline + eyebrow, not a gold or green band.

Slice 2 — scenario inputs: `/products/scenario` (optional `?product=`). CA ZIP only (90001–96162). Persist JSON at `sessionStorage` key `onyx.productExplorer.scenario`. Valid submit → `/products/results`.

Slice 3 — results on `/products/results`. Header `Your scenario`. Echo inputs. `Possible directions` shows 2–3 catalog cards from purpose mapping (not underwriting). Empty slots for future rate/payment/tradeoff — no live numbers.

After directions, show a clear **loan only vs ACR** choice. Do not hide the incentive. ACR may show an estimated membership reward as `$X to $Y` from the private helper in `components/products/rewardEstimate.ts`. Never show the formula, the base rate, or any public percent. Never guarantee a payout. Note under the ACR estimate: `Final amount is confirmed when you join and close.` Mark `Sample, not live`. If loan amount (or property value − down payment) or a starter factor is missing, show the comparison without a dollar range and keep the short note — do not invent a loan amount.

CTAs both go to intake with the scenario query plus a path token. `Start with ACR` → `/intake?…&path=acr`. `Continue loan only` → `/intake?…&path=loan`. Do not send Start with ACR to `/acr` — `/acr` stays the public product page. Fox results bubbles use the same intake URLs. Fox stays primary. No large LO CTA. No invented rates/APR/payments. California only stays site-level, not inside every card.

No inline Fox card — questions stay in the central Fox bar. Quiet originator link and Edit scenario remain. Estimates only, not a commitment to lend. No guaranteed-rate or approval language.

Do not change the homepage ACR object or locked homepage hero copy. Nav labels stay `Rates` · `ACR` · `About`. `/rates` may link quietly to `/products` and `/products/scenario`.

### Private reward estimate

The v1 membership reward range lives only in `components/products/rewardEstimate.ts` (code comments + helper). Never show the method, the base rate, product/credit factors, or any percent in the UI, Fox, or public copy. Display only a rounded dollar range (`$4,080 to $5,520`) or omit dollars when the helper returns null. Filled preview: `/products/results?product=conventional-purchase&zip=94129&purpose=purchase&propertyValue=1200000&amountMode=loan&loanAmount=960000&downPayment=240000&creditRange=760-plus&occupancy=primary&timeline=30-90`.

## Fox Intake + Always-on Fox

Preview only. California only. Client stays in control; Fox prepares a draft. Not a multi-page 1003.

### Always-on Fox

Mounted on `/` (homepage), `/acr`, `/products`, `/products/scenario`, `/products/results`, and `/intake` — not `/about`, `/rates`, or other marketing stubs.

Fox is the **central AI bar** — the operating surface, not a FAB, corner popup, or support widget. Locked visual (Design Scout):

- Fill: `--paper-elevated` `#FFFCF6` (collapsed and expanded)
- Border: 1px `color-mix(ink 18%, line)` resting (14% washed on paper — locked one step darker), hover ink 20%, focus `1.5px solid var(--ink)`. **Never** `--sunset` as the ring
- Shadow: `0 1px 0 rgba(255,252,246,0.9) inset, 0 8px 24px rgba(11,11,12,0.08)` — no colored halo
- Radius: collapsed `999px`, expanded `16px`
- Mark **in the Ask ONYX Fox bar only**: 20px geometric fox filled `--sunset` (`#E08A4F`) so it reads at a glance. Scoped via `.fox-bar__mark` — header/other marks stay ink. Label “Ask ONYX Fox”, Send, bar fill, and bar ring stay ink/paper. **Never** a sunset ring around the bar.
- Send: ink circle, paper-elevated arrow; empty 28% opacity; armed full ink; 36px desktop / 44px mobile. Never sunset
- Desktop: pinned dock, composer max 720. Mobile: full-width, collapsed 56px, above home indicator
- Bubbles: same paper-elevated + hairline + lift. Selected bubble: ink fill, not sunset

Collapsed: `Ask ONYX Fox` desk. Expands upward (question + bubbles + input). No in-bar legal.

Homepage and other pages start collapsed so the locked ACR hero stays clear. `/intake` starts expanded while Fox has an active question. First mention / header `ONYX Fox`; ongoing labels `Fox`.

Open Fox is question + bubbles + input only. Thin Close control. **No in-panel compliance** — no cannot-approve, California-only, NMLS/DRE, Legal link, or originator row. Site footer holds legal. Disclosure still exists for page footers, exact: `ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.` `--sunset` (`#E08A4F`) fills the Fox **bar mark only** — not the wordmark, label, Send, bar borders, page backgrounds, primary CTAs, open-panel fill, or ACR gold.

Scripted + session-aware. Does not call `app/api/chat`. Reads `onyx.productExplorer.scenario` and selected product. Structured questions use clickable bubbles (income, occupancy, timeline, docs, confirm). Free text remains available.

**Fox is primary.** Licensed originator is on-request only: a quiet text link `Need a licensed originator?` → `/advisor`. Do not put a primary or secondary originator button beside Fox actions. Do not open a live LO chat.

Disclosure, exact: `ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.`

### Intake (`/intake`)

One page: document drop → stub extract → draft summary → confirm. Questions, bubbles, and typing live in the central Fox bar only — not a second conversation card on the page.

- Storage: `sessionStorage` + `localStorage` key `onyx.foxIntake.draft`
- Scenario key unchanged: `onyx.productExplorer.scenario`
- Path: query `path=acr` | `path=loan` (also accepts `loan-only`). Stored on the draft as `acr` | `loan-only` so it survives refresh. Fox continues from the existing scenario. ACR path may mention the estimated reward range as context (`estimateRewardRange` / `formatRewardRange` only — never the formula or a percent) and that the final amount is confirmed when they join and close. Loan only is a mortgage draft only — no membership reward language. Confirm card may show Path quietly (`ACR` / `Loan only`). Do not expand intake questions beyond this path-aware context.
- Documents: metadata only (name, type, size, slot, status, receivedAt). Status: `received` → `reading` → `extracted` | `needs better copy` / `failed`. No file bytes in git, no upload, no public URL.
- Extraction is stubbed. Do not invent income, SSN, account, rate, or payment numbers. Empty fields stay empty and labeled.
- Audit fields: `{ field, source: client | scenario | extracted-unconfirmed, confirmed }`
- Client confirm is a short card only: name, email, phone, purpose/product, value, loan amount, occupancy, income type, documents received or skipped, plus `Looks right` / `Needs a correction`. No source labels, empty extract fields, checklist, or queue UI on the client view. `/lo/review` keeps the full worksheet.
- After confirm: `Draft confirmed — pending licensed review`
- Next step: `A licensed originator will review this.`
- Draft ≠ commitment to lend. No live pricing.
- Document drop stays on `/intake`. Client draft card hides empty fields. `/lo/review` still shows empty extracts as —.
- Preview sample: `/intake?sample=loop` resets and seeds Alex Rivera + ZIP 94129 Conventional Purchase (Sample · not live). First Fox question is income bubbles. `/lo/review?sample=loop` seeds the same draft as already confirmed.

### LO review queue

`/lo/review` — internal/back-office only. Not in public nav. Not promoted on the client intake path. Discreet footer link for this preview. Label: `Internal preview — licensed review`. Same draft store. LO marks: `needs items` | `in review` | `contacting client`. No auth wall this slice.

### Do not

Change homepage ACR / `public/acr-card-face.png`. Redesign Slice 1 cards or Slice 2 fields. Touch `app/api/chat`, `app/api/heloc-quote`, or `lib/*`. Invent rates, APR, payments, income, or NMLS/DRE numbers. Do not publish the private reward method or any reward percent.

## File map

```
styles/tokens.css                 locked CSS variables + type ramp + buttons
styles/globals.css                reset, layout, header, footer
styles/hero.css                   Slice 2 hero + pictorial ACR card
public/acr-card-face.png          locked ACR card face (house + gold + fox)
styles/spotlight.css              Slice 3 homepage Fox composer
styles/desks.css                  Slice 4 three desks
styles/rates.css                  Slice 5 rate card + comparison
styles/close.css                  Slice 6 path, proof, closer
styles/products.css               Product Explorer
styles/fox.css                    Always-on Fox + intake + LO review
styles/acr.css                    Public /acr product page
components/acr/*                  ACR hero, reward folio, unlock path, desk preview, fees, closer
components/products/catalog.ts    CA product groups + exact copy
components/products/rewardEstimate.ts  PRIVATE reward range helper (never show method or %)
components/products/PathChoice.tsx     results loan only vs ACR comparison
components/products/ProductExplorer.tsx  /products index
components/products/ProductStub.tsx      /products/[slug] stub
components/products/scenario.ts          scenario types, CA ZIP, storage
components/products/ScenarioForm.tsx     /products/scenario
components/products/directions.ts        purpose → placeholder directions
components/products/ScenarioResults.tsx  /products/results placeholder
components/fox/*                  Always-on Fox, intake draft, LO review
app/(marketing)/products/page.tsx Product Explorer
app/(marketing)/products/layout.tsx mounts Always-on Fox
app/(marketing)/products/scenario/page.tsx scenario inputs
app/(marketing)/products/results/page.tsx results placeholder
app/(marketing)/products/[slug]/page.tsx product stubs
app/(marketing)/intake/page.tsx   Fox Intake v1
app/(marketing)/lo/review/page.tsx licensed review queue (preview)
components/AdvisorMark.tsx        2–3 shape geometric fox; size="sm" = 20px
components/SiteHeader.tsx         locked sparse chrome
components/SiteFooter.tsx         sparse footer, pending-approval placeholders
components/MembershipHero.tsx     locked hero; secondary → Loan spotlight
components/AcrPass.tsx            exact locked ACR face image, no overlays
components/AdvisorSpotlight.tsx   homepage Relationship / Loan page-mode toggle
components/HomeExperience.tsx     homepage client wiring
components/ValueBreakdown.tsx     three locked desks
components/RateCard.tsx           mortgage-only off-ramp
components/ComparisonTable.tsx    Feature / ACR / traditional / loan only
components/HowItWorks.tsx         five-step path
components/ProofStats.tsx         honest OPEN stats + trust marks
components/Closer.tsx             locked closer CTAs
app/layout.tsx                    fonts + tokens
app/(marketing)/layout.tsx        header + footer + paper canvas
app/(marketing)/page.tsx          full homepage through closer
app/(marketing)/acr/page.tsx      public ACR product page
app/(marketing)/acr/layout.tsx    mounts Always-on Fox
app/(marketing)/{rates,about,login,advisor}/page.tsx   stubs
app/api/chat                      UNCHANGED
app/api/heloc-quote               UNCHANGED
lib/*                             UNCHANGED
```

## Tokens

Implemented as CSS variables in `styles/tokens.css`. Do not add a Tailwind palette or a second color system.

`--paper` is `#F6EFE4` (cohesion pass). `--paper-elevated` stays `#FFFCF6`. `--sunset` is `#E08A4F` — Ask ONYX Fox **bar mark fill only**. Do not apply sunset to the ONYX wordmark, “Ask ONYX Fox” label, Send, bar outlines, page backgrounds, primary CTAs, open-panel fills, card fills, or ACR gold. Other token hex values stay locked.

Cohesion (light visual only): hero + Spotlight share one paper opening; 1px `--line` seams between later major blocks (desks, rates/comparison, path, proof, closer); object radius 16 / UI card radius 12 with elevated paper + hairline and no shadow; ONYX comparison column is an 8% metal wash on elevated paper; path numerals are `color-mix` metal into paper (~28%); proof stats sit on one hairline row.

Metal is scarce: fox highlight, the locked ACR card gold dock, the comparison ONYX underline, and the public `/acr` reward folio’s 2px `--metal` tick.

## Shell

- Primary CTA: `Start your relationship` → `/acr`
- Nav-only truncate under 1024: `Start` + `aria-label="Start your relationship"`
- Mobile menu secondary: `Just need a mortgage` text button → `/advisor` stub
- Never “Get my rate”

## How to run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. After comparison, confirm five path steps, proof dashes (no fake volume), and the closer dual CTAs. Closer secondary should switch Spotlight to Loan. There is no sticky bar yet.

```bash
npm run build
```

## Preview-only deploy

Repo is linked to Vercel project `onyx-backend` on team ONYX Direct.

- Push this feature branch. Git integration creates a **Preview** deployment.
- Do **not** run `vercel --prod`.
- Do **not** promote the preview or assign `onyxdirect.com`.
- Production stays on `main`.

Current Preview (Ready, not Production):

- https://onyx-backend-git-cursor-onyx-slice-1-shell-8e97-onyx-direct.vercel.app
- Preview may be behind Vercel Authentication. Open it signed into the ONYX Direct team.

## Public ACR product page (`/acr`)

Public `/acr` is the product page. Reward is the reason. Goals and property are quiet desk previews, not a cockpit. Do not restyle the homepage ACR hero.

Page stack, in order:

1. **Hero** — locked ACR object via `AcrPass` / `public/acr-card-face.png` (same file, no restyle, no overlay type, no regeneration). Headline `The desk that stays open`. Eyebrow `Active Credit Relationship`. Support: ACR as an ongoing relationship. Primary `Start your relationship` → `/intake` (join/start; no invented form). Secondary quiet `Just need a mortgage` → `/products`. California only as **page** legal, not in Fox.
2. **Reward instrument (primary)** — one folio, radius **16**, `--paper-elevated`, hairline, **2px metal tick** (`--metal`). **Not a gold card.** Do not restyle or reuse the ACR card PNG as the reward. Public copy, no numbers: `A reward calculated for your relationship.` / `Unlocks after on time payments.` / `Your amount is prepared when you join.` Unlock is **quiet unlabeled ticks only** (no “6 payments”, no %). No public %, payment count, or invented dollar amount. Mark `Sample, not live`. Near the reward: `Explore a scenario to see an estimated reward range.` → `/products/scenario`.
3. **Three-line unlock path** — three quiet lines. Not the homepage 5-step path.
4. **Three desks** — reuse `ValueBreakdown`. Headline `A relationship that keeps working after close.` Same names and limits: The Rate Desk, The Credit Path, The Member Desk.
5. **On the desk** — two sample goals (max three rows) and one property card. Goals: name, current state, direction as a word or small **ink** track, one sentence, optional next. No gauges, traffic lights, or sunset. States like Watching / Monitoring. Direction words like Down / Hold. Property title `Your home`. One sentence that equity posture and HELOC/refi room will live here. No map, listings, or estimated value. Both marked `Sample, not live`. No invented $ or scores. Quiet context, not a cockpit.
6. **Comparison** — reuse homepage `ComparisonTable`. Do not invent rates.
7. **Fees / trust** — payment count, dollars, fees, and NMLS stay **OPEN / placeholder**. No invented numbers.
8. **Fox** — same central ONYX Fox AI bar (`FoxShell` / `AlwaysOnFox`), `acr` stage. Collapsed `Ask ONYX Fox`. No second Fox card. No in-panel legal. Locked bar visual. Fox cannot approve, lock, or commit to lend (footer / site legal, not in the bar).
9. **Closer** — homepage closer energy: Start your relationship / Just need a mortgage. Page-local closer (do not reuse `Closer.tsx` — it requires homepage `HomeExperience`).

No calculator. No coupon treatment. Sunset only on the Fox bar mark, not on this page’s cards.

## Still later — do not build yet

Live pricing, bank/ADP, underwriting, ACR billing, returning-client login, mobile sticky bar (Slice 9), dashboard, Advisor sheet, Classic form widget.

## What later slices must not break

- Locked CTAs, desk names, fox-mark rules, token hex values (except approved `--paper` `#F6EFE4`), Slice 2 hero copy, Slice 3 disclosure copy
- Locked ACR object: do not reopen house, zoom, gold width, or composition
- APR, decision time, amount, and as-of date stay OPEN until approved. Do not revive the `$—+` desks teaser. Reward dollars on results come only from `rewardEstimate.ts` and must never include a public percent or formula.
- `app/api/chat`, `app/api/heloc-quote`, and `lib/*` unless a slice explicitly opens them
- No dashboard or returning-chat UI until that slice
- Mobile sticky bar is Slice 9, not earlier
- No invented NMLS/DRE numbers, rates, testimonials, or compliance claims
