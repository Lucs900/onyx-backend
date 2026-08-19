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

Desktop homepage is the **clean brand hero**. Mobile homepage is Fox-first. Locked brand claim stays exact.

Locked claim (do not rewrite):

- Eyebrow: `Active Credit Relationship`
- H1: `Always approved.` / `Always optimizing.`
- Support: `We keep your credit and rate working for you.`

Do **not** put the NMLS / CA DRE / mortgage broker / how-we-get-paid line in the hero. That line lives in the footer only. Do not put disclosures inside Fox.

The hero object is the exact locked bitmap **`public/acr-card-face.png`**, shown as a clean `<img>`. Do not regenerate, restyle, or color-grade it. Keep it straight (0°). No CSS type overlay, sheen, sweep, filters, or tilt. Type/gold/fox live in the bitmap if present. Only this object may lift (soft shadow). Desktop homepage uses the large object. Mobile homepage uses a smaller object beside the claim. `/acr` keeps the larger object.

**Locked — do not reopen** house, zoom, gold width, or composition. Not the old CSS membership pass (no MEMBER, last-4, chip, or ONYX wordmark on the object).

Do **not** treat “Always approved” as a credit decision.

## Slice 3 — homepage start (`/` only)

One Fox assistant, one visible interface. No second chatbot, orb, FAB, or orange ring. Desktop and mobile are different layouts.

- **Desktop brand hero:** paper field. Left: gold rule, `ACTIVE CREDIT RELATIONSHIP`, two-line serif H1, support line, side-by-side pills (`Start your relationship` solid / `Just need a mortgage` outlined). Right: large locked ACR object only. No legal line in the hero. No expanded Fox card, dock, thread, bubbles, or composer over the desktop hero. Desktop CTAs navigate to `/start?path=acr` / `/start?path=loan` so Fox becomes the workspace, not an overlay on the hero.
- **Mobile Fox-first two-up:** compact locked claim (left) + smaller ACR object (right), tightly aligned. No legal line in the hero. Full-width Fox stage below (message, path bubbles, composer in-stage) with no excess empty card height. The stage is the same `AlwaysOnFox` instance, portaled into `#fox-home-stage`. No extra homepage dock while that stage is open. `FoxShell` skips the dock fallback on `/` so mobile first paint is not a second Fox.
- Desktop homepage has no Fox dock. The dock may return on mobile after Fox is collapsed, or on non-homepage routes.
- Opening Fox on `/` starts Idle. Starter: `I can prepare a file. Start a relationship, or just get the loan.`
- First bubbles only: `Start your relationship` (sets `path=acr`) and `Just need a mortgage` (sets `path=loan`). After a path is chosen, product chips: Buy / Refinance / HELOC / Jumbo / Other → `/start` with that path + `intent`. Never use `Use equity` as the HELOC door.
- Header and closer still carry the two path labels. No quiet text echoes under the claim.
- **No in-panel Fox disclosure.** Legal stays in the page footer / how-we-get-paid only. Not in the hero.
- Do **not** rebuild Fox intake stages in this slice. Do not implement later logged-in ACR home.

Do **not** put a Relationship / Loan mode toggle under the hero. Path choice is the desktop hero buttons or the mobile Fox bubbles (header / closer remain available).

## Slice 4 — Membership math (The Three Desks)

Section below the hero. Static open cards. No accordion. No icons. No metal.

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
- Decision / amount / as-of remain **OPEN**. Preview uses `—` and `Sample · not live`. Do not invent a live rate. Do **not** show `As low as` or an APR figure on this card.
- Product line may show `Purchase · 30-year fixed` only as a labeled sample.
- CTA `Find my rate` (56px) with `2 min · no hard credit check` → `/start?path=loan` — same loan only start as hero `Just need a mortgage`.
- Exact line under the card: `A mortgage is available without ACR.`

Comparison: Feature | ONYX ACR | Loan only. Five rows only: After close (Desk stays open / File closes), Optimization (Ongoing / None), Approval letter (From your file / Standard process), Membership reward (Calculated / None), Opportunities (Scouted from your profile / None). No Traditional lender column. No Fees or How we get paid rows. No checkmark theater. ONYX column keeps the 6px metal underline. Compensation is a quiet footer / trust link only, not a product benefit. Mobile uses stacked cards with the same two columns.

## Slice 6 — How it works + proof + closer

How it works: `THE PATH` / `Get approved. Then stay that way.` Four steps: Diagnose, Structure, Optimize, Stay in the desk. Do **not** include an Approve step. Caption under Structure: `Loan-only can stop here.` Approval is not a Fox or site step.

Proof: four OPEN placeholders (`—`), `Sample · not live`, `As of —`. No invented volume, stars, quotes, or GSE logos. Trust marks: Equal Housing, NMLS Consumer Access, Mortgage broker.

Closer: locked H2 `Always approved. Always optimizing.` Primary → `/start?path=acr`. Secondary → `/start?path=loan`. `Talk to a licensed originator` → `/start` (same Fox desk). Repeat `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.` Mobile sticky bar is Slice 9, not this slice. Do not send conversion to `/advisor`.

## Slice 2 — Fox workspace (`/start`)

Primary post-click experience after the homepage. Fox talks and the Structure updates at the same time. `/products`, `/products/scenario`, `/products/results`, `/intake`, and `/advisor` are leftover routes: redirect them into `/start`. They are not a second product. Conversion never leaves the desk.

- Routes: `/start?path=acr` and `/start?path=loan`. Persist `path` on the query and `onyx.startPath`.
- **Desktop entry:** hero `Start your relationship` writes `acr` then opens `/start?path=acr` (`draft.path = acr`). Hero `Just need a mortgage` writes `loan-only` then opens `/start?path=loan` (`draft.path = loan-only`). Every CTA / `/start?path=` entry calls `resetWorkspaceForEntry` so the prior file (amounts, docs, `sampleAccepted`, handoff) is cleared. First paint seeds the product question and bubbles. `rememberStartPath` keeps only the path token. No homepage overlay.
- Homepage hero markup/copy/layout stays the cleaned marketing hero. Only the pill destinations change (`ACR_START_HREF` / `LOAN_START_HREF` in `startPath.ts`).
- One Fox only. `StartWorkspace` renders the live `AlwaysOnFox` panel as a real child (preview left / Fox right on desktop; chat-first on mobile). `FoxShell` does not mount a second Fox on `/start`. No portal hole, no dead fallback chrome. No orb, FAB, second chatbot, or homepage overlay.
- **Desktop:** Fox chat left (`1.2fr`), live Structure right (`0.8fr`) when at least one useful line exists. Zero lines: hide Structure and center Fox at `720px`. Composer stays in the Fox stage. No dock.
- **Mobile:** Fox chat is primary. When Structure data exists, a compact Structure chip / newest-fact peek bar can expand. Keyboard pushes the composer dock. Do not nest a 500px desktop chat inside mobile.
- Structure is a tappable term sheet, not a dashboard and not a File/Preview recap. Render only lines that exist: Path, Product, Occupancy, Timeline, Numbers (as given, never invented), Rate, Reward / Letter / Scout (ACR after Looks right), Docs, Status. Paper / paper-elevated / ink / metal. Radius 16, hairline. No gold fill. Tap Path/Product/Occupancy/Timeline/Amount/Value/Docs to fix. Rate, Reward, Letter, and Scout are tap-to-explain only — never borrower-editable into a live rate. Do not show a “Which part should Fox fix?” menu. Needs a correction → `Tap any line on the structure.`
- Rate honesty: Sample `6.750%` only on Conventional 30-year purchase/refi (`Buy` or `Refinance`). Label always adjacent: `Sample · indicative · not live`. HELOC / Jumbo / Other rate line is exactly `Pricing when the file is ready`. Never fake `6.750` on those. No estimated payment next to the sample. No live-looking HELOC APR, IO payment, or “move forward” quote. No FICO on the slim sketch. No “send the app link” destination.
- Estimated ACR reward range only on the ACR path via private `estimateFromDraft` after the sketch has numbers. Never invent a live rate. Never show the private formula or a public %. Never imply approval, lock, or a commitment to lend.
- Fox flow (same on desktop and mobile): path once (from homepage CTA or Idle bubbles) → product (Buy / Refinance / HELOC / Jumbo / Other) → occupancy → timeline → **one** number (Buy/Jumbo: purchase price; Refinance/HELOC/Other: rough payoff or cash) → docs (`Upload now` / `Skip for now`) → sample structure **in the chat thread** + `Does this look right?` → Looks right → open-desk (ACR) or prepare-this-loan (loan). If path is set, never ask again. Changing path only via the Path line + confirm once (`Switch to loan only?` / `Switch to the desk?`). Credit, term, and income are not on this spine. Skip docs writes `Skipped` and does not block Confirm. One question at a time, bubbles for structured answers, free text and composer always available. Money questions autofocus a text composer with a visible caret (`inputMode=decimal`, never `type=number`) and restore focus if it is lost. Not sure / Skip for now remain. Pure numbers gain commas while typing (`6000` → `6,000`); `600000`, `600,000`, and `600k` confirm as `$600,000`. Free text is not force-formatted.
- Starters (exact): ACR `I can prepare your relationship file. We’ll keep this desk open after close.` Loan-only `This is the loan. ACR is optional if you want the desk later.`
- Sticky disclosure under the Fox header on every `/start` turn: `ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.` Header stays `ONYX Fox`. Fox cannot approve, lock, or commit to lend. California only stays site-level. Do not inherit the public Equity Fox chat.

## Slice 3 — Fox docs → draft → confirm → handoff

Continue the `/start` workspace after basics. Reuse the draft store, confirm captures, and `/lo/review` queue. Do not rebuild `/intake` as a long standalone form. One Fox only. Homepage hero stays the cleaned marketing frame.

- Docs drop on the thread or Structure only. No five-slot Waiting/Add vault (Paystubs / W-2 / Bank / ID / Other). Bubbles: `Upload now` / `Skip for now`. Skip writes `Skipped`. Missing docs do not block Confirm. No income wall.
- Originator stays on this desk. `Talk to a licensed originator` is an on-desk Fox turn, never `/advisor`.
- No name-first intake spine. No Alex Rivera / `$960k` sample seed. Those identities must not run.
- After the number, Fox writes the sample structure in chat (`Here’s a sample structure.`) — Conventional 30-year + sample rate 6.750% + `Sample · indicative · not live` only for Buy/Refinance. HELOC / Jumbo / Other show `Pricing when the file is ready`. No estimated payment. ACR reward range on the ACR path after the sketch. Then Fox asks (exact): `Does this look right?` Bubbles: `Looks right` / `Needs a correction`. Confirm is not preview-only — the written summary lives in the thread on both layouts.
- **Looks right on ACR:** open-desk. Named objects: letter (originator-issued, not Fox), scout, reward. Status becomes originator reviews. Fox stays. Disclosure stays on the thread.
- **Looks right on loan:** prepare-this-loan. Honest. No membership pitch except one later `What is ACR?` chip. Fox stays. Originator reviews.
- **Needs a correction** → `Tap any line on the structure.` No field-chip menu. Changing product restripes the rate if the sample no longer applies; do not clear path or docs.
- **One conversation engine.** `workspace.ts` + `AlwaysOnFox` own question order, bubbles, and path rules for desktop and mobile. Layout is the only difference (preview left / Fox right on desktop; chat-first + File / Preview card on mobile). Do not keep a second script, fallback chip thread, or dead `start-workspace__fox-fallback` shell. Desktop mount is the same live engine as mobile — never a one-shot portal into an empty `#fox-start-stage`.
- **Active question.** The latest Fox turn is visually current (`is-current`): ink, slightly larger/heavier. Older Fox turns are muted, no lift, no chips. Client answers stay distinct (right-aligned, readable fill) and are not faded like old Fox turns.
- **Workspace composer.** Unboxed from the first pixel. Default `.fox-bar__desk` pill (fill, hairline, radius, lift) is overridden in `styles/fox.css` next to the desk rule, scoped to `.fox-stage--workspace .fox-bar__desk` (and hover / focus-within) so first paint cannot show a square frame then unbox. No top rule. `/start` always mounts with `fox-stage--workspace` (and `fox-bar__desk--plain`). Fox mark + send stay. Do not restyle the homepage / dock Ask ONYX Fox bar.
- **Edits.** Tap a Structure line, or use a quiet Edit control on a prior answer. Natural language for occupancy/timeline/product/amount/value/docs is parsed in `workspace.ts`. Path changes only via the Path line + confirm once. Credit is not on this sketch. Updates go through `applyCapture`. Fox confirms briefly (`Updated occupancy to second home.`) and returns to the current prompt without restarting the file. Works after handoff; Fox still cannot approve, lock, or commit to lend.
- ACR and loan only stay distinct through this flow (path-specific starters and reward-panel rules). Reward estimate only on ACR via private `estimateFromDraft`. Temporary sample rate is 6.750% Conventional 30-year on Buy/Refinance only, labeled `Sample · indicative · not live`. HELOC / Jumbo / Other stay `Pricing when the file is ready`. No live rate. No public %. Disclosure on the thread, not in every bubble.
- Desktop stays Fox left / Structure right. Mobile stays chat-first with the Structure chip/sheet.

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

Mounted on `/` (homepage), `/start`, `/acr`, `/products`, `/products/scenario`, `/products/results`, and `/intake` — not `/about`, `/rates`, or other marketing stubs. `/start` is the Fox workspace: in-stage, always open, no dock.

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
styles/spotlight.css              removed — leftover Relationship / Loan toggle
styles/desks.css                  Slice 4 three desks
styles/rates.css                  Slice 5 rate card + comparison
styles/close.css                  Slice 6 path, proof, closer
styles/products.css               Product Explorer
styles/fox.css                    Always-on Fox + intake + LO review
styles/acr.css                    Public /acr product page
components/acr/*                  ACR hero, reward folio, unlock path, desk preview, fees, closer
components/acr/acrHome.ts         reserved later ACR home IA + reward-balance rules
components/acr/AskFoxButton.tsx   quiet Ask Fox → existing Fox bar
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
components/MembershipHero.tsx     Fox-first homepage claim + stage slot; locked copy
components/fox/homeIdle.ts        homepage Idle starter + path / product bubbles
components/AcrPass.tsx            exact locked ACR face image, no overlays
components/ValueBreakdown.tsx     three locked desks
components/RateCard.tsx           mortgage-only off-ramp
components/ComparisonTable.tsx    Feature / ACR / loan only (five rows)
components/HowItWorks.tsx         five-step path
components/ProofStats.tsx         honest OPEN stats + trust marks
components/Closer.tsx             locked closer CTAs
app/layout.tsx                    fonts + tokens
app/(marketing)/layout.tsx        header + footer + paper canvas
app/(marketing)/page.tsx          full homepage through closer
app/(marketing)/acr/page.tsx      public ACR product page
app/(marketing)/acr/layout.tsx    mounts Always-on Fox
app/(marketing)/rates/page.tsx    temporary rates (no live board)
app/(marketing)/about/page.tsx    short about
app/(marketing)/how-we-get-paid/page.tsx  broker compensation
app/(marketing)/{licensing,privacy,equal-housing,login,advisor}/page.tsx  short real pages
components/products/startPath.ts  ACR / loan only start intent (`/start?path=acr` | `/start?path=loan`)
components/fox/workspace.ts       workspace prompts, amount parse, live preview facts
components/fox/DocumentDrop.tsx   shared document slots + stub extract (intake + /start)
components/fox/FilePreview.tsx    calm file card / mobile File sheet
components/fox/HeroStartLink.tsx  desktop hero pills: write path + /start
components/fox/StartWorkspace.tsx `/start` layout: URL seed + live AlwaysOnFox child
styles/start.css                  workspace layout
app/(marketing)/start/page.tsx    Fox workspace route
app/(marketing)/start/layout.tsx  mounts Always-on Fox for /start
app/api/chat                      UNCHANGED
app/api/heloc-quote               UNCHANGED
lib/*                             UNCHANGED
```

## Tokens

Implemented as CSS variables in `styles/tokens.css`. Do not add a Tailwind palette or a second color system.

`--paper` is `#F6EFE4` (cohesion pass). `--paper-elevated` stays `#FFFCF6`. `--sunset` is `#E08A4F` — Ask ONYX Fox **bar mark fill only**. Do not apply sunset to the ONYX wordmark, “Ask ONYX Fox” label, Send, bar outlines, page backgrounds, primary CTAs, open-panel fills, card fills, or ACR gold. Other token hex values stay locked.

Cohesion (light visual only): one paper opening from the hero; 1px `--line` seams between later major blocks (desks, rates/comparison, path, proof, closer); object radius 16 / UI card radius 12 with elevated paper + hairline and no shadow; ONYX comparison column is an 8% metal wash on elevated paper; path numerals are `color-mix` metal into paper (~28%); proof stats sit on one hairline row.

Metal is scarce: fox highlight, the locked ACR card gold dock, the comparison ONYX underline, and the public `/acr` reward folio’s 2px `--metal` tick.

## Shell

- Primary CTA: `Start your relationship` → `/start?path=acr` (ACR start). Header and closer use the same href. Nav ACR still goes to `/acr`.
- Nav-only truncate under 1024: `Start` + `aria-label="Start your relationship"`
- Secondary / mobile `Just need a mortgage` → `/start?path=loan`
- Never “Get my rate”

## Public start paths

Homepage path choice is the desktop hero buttons or the mobile Fox Idle bubbles (header and closer remain). Product chips appear after a path is stored. There is no Relationship / Loan toggle. Intent is stored as `acr` | `loan-only` in `sessionStorage` / `localStorage` key `onyx.startPath` and carried as `path=acr` or `path=loan` on workspace, explorer, scenario, results, and intake URLs.

- ACR start: `/start?path=acr`
- Loan only start: `/start?path=loan`
- Workspace is the primary post-click surface. `/products/scenario`, `/products/results`, and `/intake` remain as fallbacks.
- `/acr` remains the public product page. Its primary CTA starts the ACR scenario path. Secondary starts loan only.
- Results still lets the client choose ACR vs loan only; those CTAs go to intake with scenario + path.
- Rates is a temporary page: no live board. Pricing is based on scenario. CTAs to `/products` and `/products/scenario`.
- About, How we get paid, licensing, equal housing, and privacy are short real pages. No invented bios, awards, volume, fees, or license numbers. NMLS / DRE stay OPEN.

## How to run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Homepage primary and secondary CTAs start ACR and loan only at `/start`. Closer uses the same hrefs. There is no sticky bar yet.

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

Public `/acr` is the product page. Reward is the reason. Goals, property, and a small Opportunities Scout mention are quiet desk previews, not a cockpit. Do not restyle the homepage ACR hero.

Page stack, in order:

1. **Hero** — locked ACR object via `AcrPass` / `public/acr-card-face.png` (same file, no restyle, no overlay type, no regeneration). Headline `The desk that stays open`. Eyebrow `Active Credit Relationship`. Support: ACR as an ongoing relationship. Primary `Start your relationship` → `/start?path=acr`. Secondary quiet `Just need a mortgage` → `/start?path=loan`. California only as **page** legal, not in Fox.
2. **Reward instrument (primary)** — one folio, radius **16**, `--paper-elevated`, hairline, **2px metal tick** (`--metal`). **Not a gold card.** Do not restyle or reuse the ACR card PNG as the reward. Public copy, no numbers: `A reward calculated for your relationship.` / `Unlocks after on time payments.` / `Your amount is prepared when you join.` Unlock is **quiet unlabeled ticks only** (no “6 payments”, no %). No public %, payment count, or invented dollar amount. Mark `Sample, not live`. Near the reward: `Explore a scenario to see an estimated reward range.` → `/products/scenario`.
3. **Three-line unlock path** — three quiet lines. Not the homepage 5-step path.
4. **Three desks** — reuse `ValueBreakdown`. Headline `A relationship that keeps working after close.` Same names and limits: The Rate Desk, The Credit Path, The Member Desk.
5. **On the desk** — two sample goals (max three rows), one property card, and a small Opportunities Scout mention. Goals: name, current state, direction as a word or small **ink** track, one sentence, optional next. No gauges, traffic lights, or sunset. States like Watching / Monitoring. Direction words like Down / Hold. Property title `Your home`. One sentence that equity posture and HELOC/refi room will live here. Scout title `Opportunities Scout`: uses profile and equity posture to project possible next moves; quiet example labels only (Equity available, Purchase power, Portfolio move); a financing path is attached. Quiet `Ask Fox` opens the existing Fox bar. No MLS, listings, addresses, valuations, dollars, returns, or fake wallet. All marked `Sample, not live`. No invented $ or scores. Quiet context, not a cockpit.
6. **Comparison** — reuse homepage `ComparisonTable`. Feature | ONYX ACR | Loan only. Five rows only (After close, Optimization, Approval letter, Membership reward, Opportunities). No Traditional lender, Fees, or How we get paid rows. Do not invent rates.
7. **Trust** — quiet NMLS / DRE OPEN line and a small How we get paid link. Not a featured fee table or compensation benefit. No invented numbers.
8. **Fox** — same central ONYX Fox AI bar (`FoxShell` / `AlwaysOnFox`), `acr` stage. Collapsed `Ask ONYX Fox`. No second Fox card. No in-panel legal. Locked bar visual. Fox cannot approve, lock, or commit to lend (footer / site legal, not in the bar).
9. **Closer** — homepage closer energy: Start your relationship / Just need a mortgage. `/acr` uses a page-local closer with the same start hrefs.

No calculator. No coupon treatment. Sunset only on the Fox bar mark, not on this page’s cards.

## Later logged-in ACR home (reserved — do not fully build)

Logged-in ACR home is not live. Do not ship a fake dashboard or a fake rewards wallet on any public page. Types and order live in `components/acr/acrHome.ts`.

Later home order:

1. Reward status / balance
2. Goals
3. Property / equity
4. Opportunities Scout

Reward balance rules (locked):

- Before unlock: progress only
- After unlock: current rewards balance
- Public pages: no fake balance
- This pass: do not invent a live rewards wallet

Later Opportunities Scout cards, max 3:

- Equity available
- Purchase power
- Portfolio move

Each later card: title, one sentence, possible financing path, Ask Fox. No MLS search, invented listings, addresses, valuations, dollar amounts, or return promises. Fox is the operator for opportunity follow-up — open the existing Fox bar, do not add a second chat widget.

Public `/acr` may show those three titles as quiet sample labels only.

## Still later — do not build yet

Full Fox intake stages from `ONYX-fox-first-experience.md` (this slice is homepage Idle only). Live pricing, bank/ADP, underwriting, ACR billing, returning-client login, mobile sticky bar (Slice 9), dashboard, Advisor sheet, Classic form widget.

## What later slices must not break

- Locked CTAs, desk names, fox-mark rules, token hex values (except approved `--paper` `#F6EFE4`), Slice 2 hero copy, Slice 3 disclosure copy
- Locked ACR object: do not reopen house, zoom, gold width, or composition
- APR, decision time, amount, and as-of date stay OPEN until approved. Do not revive the `$—+` desks teaser. Reward dollars on results come only from `rewardEstimate.ts` and must never include a public percent or formula.
- `app/api/chat`, `app/api/heloc-quote`, and `lib/*` unless a slice explicitly opens them
- No dashboard or returning-chat UI until that slice
- Mobile sticky bar is Slice 9, not earlier
- No invented NMLS/DRE numbers, rates, testimonials, or compliance claims
