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

One Fox assistant, one conversation engine, one visible interface. No second chatbot, orb, FAB, or orange ring. Desktop and mobile are different layouts. Homepage Fox **is** the start of `/start`.

- **Desktop brand hero:** paper field. Left: gold rule, `ACTIVE CREDIT RELATIONSHIP`, two-line serif H1, support line, side-by-side pills (`Start your relationship` solid / `Just need a mortgage` outlined). Right: large locked ACR object. Live Fox start below (same `workspacePrompt` / `workspaceReply` / `AlwaysOnFox` thread + dual-path bubbles + composer). Claim stays; Fox is the start. Not a static-only hero and not a popup overlay. No legal line in the hero.
- **Mobile Fox-first two-up:** compact locked claim (left) + smaller ACR object (right), tightly aligned. No legal line in the hero. Full-width Fox stage below (message, path bubbles, composer in-stage) with no excess empty card height. That Fox is the same session as `/start`, not a marketing greeting that later restarts. The stage is the same `AlwaysOnFox` instance, portaled into `#fox-home-stage`. No extra homepage dock while that stage is open. `FoxShell` skips the dock fallback on `/` so mobile first paint is not a second Fox.
- Desktop homepage has no Fox dock. One house on both layouts.
- Homepage first Fox turn is the same as `/start` with no path: `Start a relationship, or just the loan?` Dual-path bubbles: `Start your relationship` / `Just need a mortgage`. Then product chips: Buy / Refinance / HELOC / Jumbo / Other. Never use `Use equity` as the HELOC door. Do not stuff the desk disclosure into the first homepage bubble.
- Typed homepage turns stay on the draft. `I want to buy` captures `productIntent=buy` (path still unset unless they also picked a path). `/start` hydrates the live draft + messages — it does **not** call `resetWorkspaceForEntry` when the client already started talking or a product/intent is captured.
- Cold CTA (hero / header / closer, no prior turns): still `resetWorkspaceForEntry` + `/start?path=acr|loan` and the first question immediately. No `Opening your file…` interstitial.
- Header and closer still carry the two path labels. No quiet text echoes under the claim.
- **No in-panel Fox disclosure on the homepage.** Sticky disclosure stays under the Fox header on the `/start` desk only.
- Do **not** rebuild Fox intake stages in this slice. Do not implement later logged-in ACR home.

Do **not** put a Relationship / Loan mode toggle under the hero. Path choice is the desktop hero buttons, the Fox bubbles, or header / closer.

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

How it works: `THE PATH` / `We keep your credit and rate working for you.` Four steps: Diagnose, Structure, Optimize, Stay in the desk. Do **not** include an Approve step. Caption under Structure: `Loan-only can stop here.` Approval is not a Fox or site step. Do **not** use “Get approved” or imply a credit decision.

Proof: four OPEN placeholders (`—`), `Sample · not live`, `As of —`. No invented volume, stars, quotes, or GSE logos. Trust marks: Equal Housing, NMLS Consumer Access, Mortgage broker.

Closer: locked H2 `Always approved. Always optimizing.` Primary → `/start?path=acr`. Secondary → `/start?path=loan`. `Talk to a licensed originator` → `/start` (same Fox desk). Repeat `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.` Mobile sticky bar is Slice 9, not this slice. Do not send conversion to `/advisor`.

## Slice 2 — Fox workspace (`/start`)

Primary post-click experience after the homepage. Fox talks and the Structure updates at the same time. `/products`, `/products/scenario`, `/products/results`, `/intake`, and `/advisor` are leftover routes: redirect them into `/start`. They are not a second product. Conversion never leaves the desk.

- Routes: `/start?path=acr` and `/start?path=loan`. Persist `path` on the query and `onyx.startPath`.
- **Desktop entry:** hero `Start your relationship` writes `acr` then opens `/start?path=acr` (`draft.path = acr`). Hero `Just need a mortgage` writes `loan-only` then opens `/start?path=loan` (`draft.path = loan-only`). Cold CTA / `/start?path=` entry (no prior turns) calls `resetWorkspaceForEntry` so a prior closed file (amounts, docs, `sampleAccepted`, handoff) is cleared. If the homepage thread already has a client turn or a captured product/intent, `continueWorkspaceFromEntry` hydrates that session instead. First paint of a fresh path seeds the product question and bubbles. `rememberStartPath` keeps only the path token when the URL has one. No homepage overlay pretending to be chat.
- Homepage claim + ACR object stay. Fox start on `/` is the same engine as `/start`. Pill destinations stay `ACR_START_HREF` / `LOAN_START_HREF` in `startPath.ts`.
- One Fox only. `StartWorkspace` renders the live `AlwaysOnFox` panel as a real child (preview left / Fox right on desktop; chat-first on mobile). `FoxShell` does not mount a second Fox on `/start`. No second composer. No portal hole, no dead fallback chrome. No orb, FAB, second chatbot, or homepage overlay.
- **Desktop:** Fox chat left (`1.2fr`), live Structure right (`0.8fr`) when at least one useful line exists. Zero lines: hide Structure and center Fox at `720px`. Composer stays in the Fox stage. No dock.
- **Mobile:** Fox chat is primary. Structure is a File sheet from the dock chip (`Structure · {n} facts` or the newest fact), a true overlay over the thread. Same `StructureRows` + `previewFacts` as desktop. Keyboard pushes the dock. Do not stack an inline Structure card under the thread. Do not nest a 500px desktop chat inside mobile.
- Structure is a tappable term sheet, not a dashboard and not a File/Preview recap. Render only lines that exist: Path (`Relationship desk` / `Loan only`), Product, Occupancy, Timeline, the named dollar line (`Purchase price` / `Loan amount` / `HELOC line` — never `Amount` or `Numbers`), Credit, Income, Rate, Reward (ACR after the sketch is ready), Letter / Scout (ACR after Looks right), Originator (after Looks right: `Licensed originator assigned` — do not invent a name or NMLS), Docs, Status. Paper / paper-elevated / ink / metal. Radius 16, hairline (`1px solid var(--fox-hairline)`). No gold fill. Tap Path/Product/Occupancy/Timeline/the named dollar line/Credit/Income/Docs to fix. Rate, Reward, Letter, Scout, Originator, and Status are tap-to-explain or desk-state notes — never borrower-editable into a live rate. Do not show a “Which part should Fox fix?” menu. Needs a correction → `Tap any line on the structure.`
- Rate honesty: Sample `6.750%` only on Conventional 30-year purchase/refi (`Buy` or `Refinance`). Label always adjacent, including the in-thread `Here’s a sample structure` recap: `Sample · indicative · not live`. HELOC / Jumbo / Other rate line is exactly `Pricing when the file is ready`. Never fake `6.750` on those. Never show `6.750%` naked. No estimated payment next to the sample. No live-looking HELOC APR, IO payment, or “move forward” quote. No FICO-first theater. No “send the app link” destination.
- Estimated ACR reward range only on the ACR path via private `estimateFromDraft` after the sketch is ready. Never invent a live rate. Never show the private formula or a public %. Never imply approval, lock, or a commitment to lend.
- Fox flow (same on desktop and mobile): path once (from homepage CTA or Idle bubbles) → product (Buy / Refinance / HELOC / Jumbo / Other) → occupancy → timeline → **one named number** (Buy/Jumbo: purchase price; Refinance: approximate loan / payoff; HELOC: requested line or cash; Other only if they tapped Other: what the number is for, then that label) → **credit range** (`760+` / `720–759` / `680–719` / `Not sure`) → **income type** (`W-2` / `Self-employed` / `Both` / `Other`) → sample structure **in the chat thread** + `Does this look right?` → Looks right → file prepared, licensed originator assigned, Fox stays. Docs are after confirm: Fox asks the short missing list for that income type, then Skip. If path is set, never ask again. Changing path only via the Path line + confirm once (`Switch to loan only?` / `Switch to the desk?`). Term, name, email, and phone are not on the pre-confirm spine. Income is on the spine only as far as needed to filter docs — not a 1003. One question at a time, bubbles for structured answers, free text and composer always available. Money questions autofocus a text composer with a visible caret (`inputMode=decimal`, never `type=number`) and restore focus if it is lost. Not sure / Skip for now remain. Pure numbers gain commas while typing (`6000` → `6,000`); `600000`, `600,000`, and `600k` confirm as `$600,000`. Free text is not force-formatted. Never ask a naked amount. Product is Other only when they tap Other — not from a typed buy/refi/HELOC/jumbo sentence, and not from a docs `other` slot.
- Starters (exact): ACR `I can prepare your relationship file. We’ll keep this desk open after close.` Loan-only `This is the loan. ACR is optional if you want the desk later.`
- Sticky disclosure under the Fox header on every `/start` turn: `ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.` Do **not** repeat that string in the first Fox bubble. Header stays `ONYX Fox`. Fox cannot approve, lock, or commit to lend. California only stays site-level. Do not inherit the public Equity Fox chat.

## Slice 3 — Fox docs → draft → confirm → handoff

Continue the `/start` workspace after basics. Reuse the draft store, confirm captures, and `/lo/review` queue. Do not rebuild `/intake` as a long standalone form. One Fox only. Homepage hero stays the cleaned marketing frame.

- One drop target. After Looks right, `Upload docs` opens a filtered drop in the Fox thread. Mobile uses that same thread drop above the File dock — not a new page. Do not mount a second drop on Structure at the same time. No five-slot Waiting/Add vault of Paystubs / W-2 / Bank / ID / Other for every path. Missing docs do not block Confirm or Fox. Skip writes `Docs: Skipped`. File stays prepared.
- After Looks right the file is prepared and a licensed originator is assigned (accountability). Do not invent a name or NMLS. Fox stays the primary surface. Next useful actions: upload docs, tap a Structure line, ask about the desk. `Request human` is optional, stays on this desk, and does not restart. Do **not** make “Talk to a licensed originator” or “LO will contact you” the default ending. Do **not** force name/email/phone collection. Do **not** loop `I’m preparing this desk…`. Never `/advisor`.
- No name-first intake spine. No Alex Rivera / `$960k` sample seed. Those identities must not run.
- After credit **and income type**, Fox writes the sample structure in chat (`Here’s a sample structure.`) — Conventional 30-year + sample rate 6.750% + `Sample · indicative · not live` only for Buy/Refinance, including the in-thread recap facts. HELOC / Jumbo / Other show `Pricing when the file is ready`. No estimated payment. ACR reward range on the ACR path after the sketch. Then Fox asks (exact): `Does this look right?` Bubbles: `Looks right` / `Needs a correction`. Confirm is not preview-only — the written summary lives in the thread on both layouts.

## Slice D — docs after structure confirm, filtered by income type

Income type is a structure-changing question on the shared spine, after credit and before Looks right. It exists only to filter the post-confirm drop. Do not add a 1003.

- Ask `How is income earned?` with `W-2` / `Self-employed` / `Both` / `Other`. Other settles the question. Structure writes an Income line, tappable like the other facts.
- `workspacePrompt` after credit + income returns `review`, never `documents`. Documents are not a pre-confirm spine step. Opening upload from `done` is a side action (`docsOpen`); it does not replay a blocking docs prompt or change file motion.
- After Looks right, Fox asks the short missing list, then Skip. One dropzone. Do not lead with `Drop what you have. Skip is fine.` Copy:
  - W-2: government ID, latest paystub, W-2
  - Self-employed: government ID, tax return
  - Both: the union of those
  - Other income: government ID + tax return (same as self-employed until product matrix)
  After a successful upload, refresh the list. Do not re-ask received / ready / skipped. Filename-classified paystub / W-2 / ID stay `Paystubs in` / `W-2 in` / `ID in` — never `Other in`.
- Skip writes `Docs: Skipped`. File stays prepared. Fox stays. Occupancy tap-edit still does not re-ask docs.
- **Looks right on ACR:** file prepared. Originator row `Licensed originator assigned` (accountability, not the borrower-facing status). Status is file motion (`gathering` / `ready`, then finish-line). Letter / scout / reward on the desk. Fox stays.
- **Looks right on loan:** file prepared. Same assigned originator accountability. Honest. No membership pitch except one later `What is ACR?` chip. Fox stays.
- **Needs a correction** → `Tap any line on the structure.` No field-chip menu. Changing product restripes the rate if the sample no longer applies; do not clear path or docs. Occupancy tap-edit does not re-ask docs.
- **One conversation engine.** `workspace.ts` + `AlwaysOnFox` own question order, bubbles, and path rules for desktop and mobile. Layout is the only difference (preview left / Fox right on desktop; chat-first + File / Preview card on mobile). Do not keep a second script, fallback chip thread, or dead `start-workspace__fox-fallback` shell. Desktop mount is the same live engine as mobile — never a one-shot portal into an empty `#fox-start-stage`.
- **Active question.** The latest Fox turn is visually current (`is-current`): ink, slightly larger/heavier. Older Fox turns are muted, no lift, no chips. Client answers stay distinct (right-aligned, readable fill) and are not faded like old Fox turns.
- **Workspace composer.** Unboxed from the first pixel. Default `.fox-bar__desk` pill (fill, hairline, radius, lift) is overridden in `styles/fox.css` next to the desk rule, scoped to `.fox-stage--workspace .fox-bar__desk` (and hover / focus-within) so first paint cannot show a square frame then unbox. No top rule. `/start` always mounts with `fox-stage--workspace` (and `fox-bar__desk--plain`). Fox mark + send stay. Do not restyle the homepage / dock Ask ONYX Fox bar.
- **Edits.** Tap a Structure line, or use a quiet Edit control on a prior answer. Natural language for occupancy/timeline/product/amount/value/credit/docs is parsed in `workspace.ts`. Path changes only via the Path line + confirm once. Credit is a first-class sketch fact. Updates go through `applyCapture`. Structure-fix completion appends a quiet system line (`Updated occupancy to Second home.`) then a separate Fox ask. No toasts. Works after handoff; Fox still cannot approve, lock, or commit to lend.
- ACR and loan only stay distinct through this flow (path-specific starters and reward-panel rules). Reward estimate only on ACR via private `estimateFromDraft`. Temporary sample rate is 6.750% Conventional 30-year on Buy/Refinance only, labeled `Sample · indicative · not live` wherever that number appears. HELOC / Jumbo / Other stay `Pricing when the file is ready`. No live rate. No public %. Disclosure under the Fox header only, not in the first bubble.
- Desktop stays Fox left / Structure right. Mobile stays chat-first with the Structure File sheet from the dock chip.

## BUILD 1 — real document intake (preview only)

Replaces the fake `useDocumentReads` timer. After Looks right, `Upload docs` still opens one Fox-thread drop. No second drop on Structure or the mobile File sheet. Spine stays A–D. Fox stays. Assigned originator stays. Zero docs still reaches assigned originator.

### Storage (as shipped)

- Bytes persist **server-side on Vercel Blob, private**. No public URL is written into the browser draft.
- Browser draft (`onyx.foxIntake.draft` v2) keeps metadata only: `{ slot, name, type, size, receivedAt, status, note, bytesRef, extractClass }`. `bytesRef` is the private Blob **pathname**.
- Upload path: browser → `@vercel/blob/client` `upload(..., { access: "private", handleUploadUrl: "/api/docs/upload" })` so 15 MB files do not go through the function body.
- Extract path: `POST /api/docs/extract` with `{ bytesRef }` → server `get(pathname, { access: "private" })` → classify/extract. Signed/OIDC read on the server only. Fox never receives raw PDF bytes.
- Caps: 15 MB each, 10 files. Accept PDF, JPEG, PNG, HEIC, WebP. Other types: one line, `Use a PDF, JPEG, PNG, HEIC, or WebP under 15 MB.`
- Client upload **requires** `BLOB_READ_WRITE_TOKEN` (`handleUpload` cannot mint tokens from OIDC alone). On Vercel, a **private** Blob store linked to `onyx-backend` (Preview) is the provision step. If that token/store is missing, routes return `503 STORAGE_BLOCKED` and do not invent a public blob URL.
- Dedicated routes only: `/api/docs/upload`, `/api/docs/extract`. Do **not** call `/api/chat` or `/api/heloc-quote`.

### Extract schema as shipped

One adapter (`lib/docs/extract.ts`) calls the existing Grok key (`grok_api_key`) through `@ai-sdk/openai` + `https://api.x.ai/v1`, model `grok-2-vision-1212`. No new paid OCR vendor.

`classify(bytes) → { class, confidence }` then `extract(bytes, class) → fields + warnings`.

Classes and keys (V1 only):

- `government_id`: full_name, date_of_birth, id_last4, state, expiration
- `paystub`: employer_name, pay_period_end, gross_period, ytd_gross, net_period
- `w2`: tax_year, employer_name, wages, federal_withheld
- `tax_return`: tax_year, filing_status, agi
- `bank_statement`: institution, period_end, ending_balance
- `purchase_contract`: property_address, purchase_price, close_date
- `mortgage_statement`: servicer, unpaid_principal, current_pi, property_address

Slot map: government_id→id, paystub→paystubs, w2→w2, tax_return→other, bank_statement→bank, purchase_contract→other, mortgage_statement→other.

Write extracted facts onto the same draft `/lo/review` already reads (`facts` + existing contact/value fields). Source starts as `extracted-unconfirmed` and is confirmed on empty write or after a conflict tap. Empty Structure/fact → write. Same value → keep, no question. Credit range stays typed. Docs never write FICO. Full SSN and full account numbers are dropped; ID may store last4 only.

Low-confidence / `other`: keep bytes, do not invent numbers, Structure/docs note `Document received`. Failed read: keep bytes, status `failed`, exact copy `Fox could not read this file. Type a note or skip. No dollar amounts were invented.`

Quiet system line on write, not a loud Fox bubble: e.g. `Updated income from paystub.`

### Missing-item ask (one short group)

Always after Looks right, from income type only (no product-matrix extras):

- W-2: government ID, latest paystub, W-2
- Self-employed: government ID, tax return
- Both: union of those
- Other income: government ID + tax return

Do not ask a class that is received, ready, or skipped. Do not re-ask path, occupancy, credit, or a fact already on Structure. Skip writes `documentsSkipped` and remaining requested classes into `skippedClasses`. File stays with-originator. Later upload still works. Extract class `other` must not change Product or remap a filename-classified paystub / W-2 / ID into `Other in`.

### Conflict behavior

If a typed/File value differs from the document, Fox does **not** overwrite. It asks once: file vs document. Borrower tap wins (`Keep file` / `Use document`). Example: typed income ≠ paystub period pay.

### Walk (this build)

A. Buy spine asks purchase price; Structure says `Purchase price`.
B. Refi spine asks approximate loan / payoff; Structure says `Loan amount`.
C. HELOC spine asks line or cash needed; Structure says `HELOC line`.
D. Tapping Buy / Refi / HELOC / Jumbo never lands Product Other.
E. After Looks right on W-2, Fox lists government ID, latest paystub, W-2 (not a generic drop line). Skip works.
F. Paystub extract still writes Employer / Pay; Docs is `Paystubs in`, not `Other in`.

1. After Looks right, upload a paystub (or labeled sample). Structure gains employer/pay facts. Spine is not replayed.
2. Typed income ≠ paystub → Fox asks once, does not overwrite.
3. Missing group names only what’s still open. Skip still works.
4. Unreadable file: received + failed, no invented numbers.
5. Desktop and mobile same engine.
6. Zero docs still reaches assigned originator.

## BUILD 2 — file motion (preview only)

Same branch / PR. Do not merge `main`. No production. No public cutover. Sit on the existing File: `FoxIntakeDraft` in `onyx.foxIntake.draft`. `/start` and `/lo/review` read and write that same draft. No second database.

### Locked operating model

- Finish line after Looks right: **Proceed · Upload more · Not yet**. Request human stays a side door.
- Fox owns file motion, including the ONYX queue nudge.
- Assigned originator is accountability (Structure fact). It is not the borrower-facing status.
- No “LO will contact you” / “we’ll be in touch” / “your LO has the file”.
- Skip is not Proceed. Skip + Proceed is allowed.
- Structure always shows **Status** + **Next** (`You` | `Fox` | `ONYX` | `Outside`) once facts exist.
- Return to Fox from `/lo/review` lands in the borrower thread.
- One File.

### Motion

`confirmed | gathering | ready | in_queue | needs_you | on_hold | escalated`

`waiting_out` is not faked (no UW / appraisal theater).

Copy:

- gathering: `Still useful: {list}. Skip is fine.`
- ready: `This file can move. Proceed, upload more, or not yet.`
- in_queue: `ONYX has this for review. I’m on it — I’ll nudge if it sits and I’ll bring the result back here.`
- needs_you: `I need {one thing} from you.`
- on_hold: `Holding. I’ll keep the file. Say when to proceed.`
- escalated: `A licensed originator is on this exception. I stay here. I’ll put their result in this thread.`

Stored on the same draft: `motion`, `nextActor`, `workItems[]`, `events[]`, `previewOutbox[]`, `pendingFinish`, `reviewSlaMs`.

### Finish line

1. Looks right → missing list + chips Proceed · Upload more · Not yet. Originator fact appears. Status is `gathering` or `ready`. Next = You.
2. Proceed → WorkItem `kind=review` on this File, motion `in_queue`, Next = ONYX. If email is missing, one field (`What’s a good email? I’ll remind you.`) — not an account wall. Preview outbox may show in-thread (`I’ll remind you`). No SMS.
3. Upload more → stay gathering. Same missing list. Drop stays in the Fox thread.
4. Not yet → `on_hold`. Same File. Missing memory intact.
5. Skip → docs skipped, not a WorkItem. File can still Proceed.
6. Request human → `escalated` (side door). Next = ONYX. Fox stays.

After Proceed, do not leave Request human as the only action. Fox stays the interface while ONYX reviews. Primary chips: **What happens next? · Upload more · Ask Fox**. Request human is a quiet side door. What happens next? explains the wait in Fox — no “LO will contact you.” Upload more stays gathering-capable on the same File (missing list + dropzone); the review WorkItem can stay. Status may restripe gathering if they upload.

### Sit / nudge

Default SLA is 4 hours. If a review WorkItem sits, Fox nudges it and says so in the borrower thread.

Preview walk (do not wait 4 hours):

- `/start?sla=30` or `/lo/review?sla=30` — 30-second clock
- `/start?nudge=now` or `/lo/review?nudge=now` — force a nudge
- `/lo/review` **Sit expired** / **Nudge now** chips

### Return to Fox

`/lo/review` writes a result note + optional **needs a doc** onto the same File (event + WorkItem `returned`). The typed note is the borrower thread line. Do not fall back to a canned missing-class ask (`I need government ID from you`) unless that is what they wrote. If **needs a doc**, restripe `needs_you` with that note. Next = You.

`/start` **resumes** that same File after Looks right / Proceed / hold / gathering / ready / `in_queue` / `needs_you` / escalated. `path=acr` or `path=loan` on the URL is not a fresh start while the File is in motion. `?nudge=now` on `/start` must not wipe the draft. Fresh start stays the homepage CTA only (`HeroStartLink` / `beginWorkspaceFromHero` / `resetWorkspaceForEntry` from homepage). `seedWorkspaceMessages` must not re-seed an empty spine over a restored in-motion thread.

`/lo/review` reads the same File facts (`productIntent`, named amount, occupancy). Do not hide Buy / `$850,000` behind “No scenario attached” when those values live on the draft.

### Walk

1. Looks right → missing list → Proceed / Upload more / Not yet. No LO-will-contact copy.
2. Proceed → Status `in_queue`, Next = ONYX, originator still assigned.
3. Return to Fox from `/lo/review` → one thread line + Structure restripe.
4. Skip ≠ Proceed. Not yet holds. Status + Next always visible.
5. Sit/nudge walkable in preview (short SLA or a test control).

Shared preview URLs (same device File):

- `/start`
- `/lo/review`

## Product matrix v1 — wire branching only (preview)

Same branch / PR. Do not merge `main`. No production. No public launch. No new products. No guideline bible. Existing chips only: Buy / Refinance / HELOC / Jumbo. Other only if they tap Other. Do not silently flip Product.

Spine A–D, BUILD 2 finish line, Fox-as-interface, assigned originator accountability, BUILD 1 extract / Skip / conflict / fixture guard, homepage locks, and the header disclosure stay intact.

### Amount (already locked)

- Buy: ask purchase price. Structure: `Purchase price`
- Refinance: ask loan / payoff. Structure: `Loan amount`
- HELOC: ask line or cash. Structure: `HELOC line`
- Jumbo: if they tap Jumbo first, ask buy vs refi, then the matching amount. Never a naked `Amount`.

### Preview rate (one slot)

Conv 30 `Preview rate · not live` (`6.750%`) only when Product is Buy or Refinance, occupancy is primary or second, and the treated loan is not above the **2026 FHFA high-cost ceiling `$1,249,125`**. Do **not** use `$832,750`.

- HELOC, Jumbo, Investment occupancy, FHA/VA/USDA they name, or a loan that looks above the ceiling: `Pricing when the file is ready`. Never invent `6.750%` there.
- If Purchase / Refi looks above `$1,249,125`, **offer Jumbo once**. Do not silently flip the Product line.
- Reward is still not invented dollars. If the rate is pricing-when-ready, Reward is `Prepared when you join` (ACR) or hidden (loan only).

### Branch / do not deny

- Not CA → `I can only prepare California files. I cannot prepare this file.` Honest stop. Fox stays. No “LO will contact you.”
- FHA / VA / USDA named → no preview rate, Request human available, Fox stays. Product chip does not become a new government product.
- Active bankruptcy / foreclosure they name → no preview rate, can still Proceed, may escalate. Fox stays.
- Buy typed on a Refinance path → switch to Buy, no restart.
- Cash + keep first on a Refinance path → offer HELOC once.
- HELOC but they are buying → Buy.
- HELOC but replace first → Refinance.
- Status + Next stay. Skip ≠ Proceed.

### Walk

1. Buy: purchase price, preview rate on primary, investment → pricing when ready.
2. Refi: loan amount, preview rate on primary.
3. HELOC: HELOC line, no `6.750%`.
4. Jumbo: pricing when ready; purpose then matching amount.
5. Looks right → missing list → Proceed still works.

## Guideline v1 — completeness wiring (preview)

Same branch / PR. Do not merge `main`. No production. No public launch. No denial engine. No DU / AUS / “you qualify.” Borrower never sees a 1003. Build 2 finish line stays **after** the sketch is actually complete.

### Required fields before Looks right

Defined per product. Empty required Structure lines stay visible as quiet `—`. Do not hide them.

- **Conventional purchase:** occupancy, timeline, purchase price, **down payment and loan amount** (show both; one given implies the other as proposed — confirm before write). Credit range. Income type. Looks right is blocked until price + (down **or** loan) exist. Fox asks the missing funds line after price.
- **Conventional refinance:** occupancy, timeline, loan amount (payoff), property value, credit range, income type. Looks right blocked until loan amount + property value exist.
- **HELOC (thin):** occupancy, timeline, HELOC line, credit, income. No agency completeness score. Looks right allowed with those.
- **Jumbo:** buy uses purchase minimums; refi uses refi minimums. Still no preview rate. No agency completeness score.

### Quiet File map

Conventional purchase / refinance only. Sit **File** next to Status + Next on Structure (desktop aside + mobile File sheet). Same `previewFacts` engine.

States: `sketch` | `documented` | `agency_partial`. Never `agency_ready` in v1. Copy like `sketch · 3 of 5` or `documented`. No progress-bar theater. No “approved.”

Groups: Identity (name / ID extract), Property (occupancy, address if known), Loan (purpose + required amounts), Income (type + confirmed extract), Credit (range only). Do not mark documented / agency_partial / ready if agency-shaped minimums are missing.

### Confirm-before-write

Extract or suggest → proposed on Structure → Keep file / Use document / Yes that’s me → then write. High-confidence doc extract may still fill empty lines. Changing an existing fact asks once and does not overwrite. Public/web suggestions are `Suggested · not verified` and never a hard UW fact. Preview stub: `/start?suggest=employer`. Do not scrape LinkedIn in this slice.

Computed purchase companion (price + down ⇒ loan, or price + loan ⇒ down) is proposed and confirmed — not a public suggestion.

### Liabilities v1 — one stated monthly total

After income is handled on a CA conventional sketch — qualifying income on the File, the next income ask (time-on-job for W-2, years in business for self-employed) Skip / Not yet, or the income-docs next action — Fox may ask once for stated monthly debts excluding the subject mortgage. Skip / Not yet is first-class and writes nothing. A number (800, $800, about 800, 800 a month) confirm-before-write:

`That’s $800 a month in other debts, not counting this mortgage. Suggested · not underwritten. Use this?`

Use this writes `statedMonthlyDebts`. Leave blank writes nothing and restores the next action. Structure shows `Stated monthly debts` with `Suggested · not underwritten` and stays editable mid-file. Start over is a full reset only.

If the borrower includes the subject mortgage in the total, ask once and offer to subtract. Do not silent-write a blended number.

No itemized liability maze. No cards / autos / student / HOA form. No bureau pull. No tradelines. No borrower FNMA export. Still useful may list stated monthly debts as optional, never required. Looks right / Proceed still work with the field empty.

Readiness: empty debts keep the locked thin / not-ready / strong / UW-review lines. A confirmed total may color not-ready or UW-review only when the payment is obviously large versus suggested income. Never print “stated DTI” or “your DTI is X%.” Strong still includes the final-underwriting sentence.

### Assets / reserves v1 — one stated available-funds picture

After the debts ask (or debts Skip), before the docs maze, Fox may ask once for cash / available funds. Skip / Not yet writes nothing. A number (50000, $50,000, 50k, about 50k) confirm-before-write:

`That’s $50,000 in available funds. Suggested · not underwritten. Use this?`

Use this writes `statedAvailableAssets`. Leave blank writes nothing and restores the next action. Structure shows `Stated available assets` with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Bank statement extract → suggest → confirm → write. Never silent-write:

`The statement shows about $18,400. Suggested · not underwritten as available assets. Use this?`

If the typed field is empty, offer the extract instead of a second typed ask. If a typed number is already confirmed and the extract differs, ask once (Use document / Keep the typed number). After a confirmed extract, do not re-ask the typed question.

Still useful may list stated available assets as optional, never required. Bank statement stays a useful document, not a gate.

Readiness: empty assets keep existing lines. Confirmed assets obviously below purchase cash down:

`This does not look ready yet. Available funds look short of the $170,000 down payment. More cash to close would likely help.`

Do not invent closing costs, reserve-month counts, or a gift. Do not claim reserves are enough when assets meet the down. Funds-short fires only when a purchase down exists. Assets alone never create a strong line.

### Property / subject v1 — one optional property type

After the assets ask (or assets Skip), before the docs maze, Fox may ask once for house / condo / 2–4. Skip / Not yet writes nothing. Occupancy is not re-asked. A chip or synonym (single family, sfr, condo, duplex, 2 unit, fourplex) confirm-before-write:

`That’s a condo. Suggested · not underwritten. Use this?`

Use this writes `propertyType` (`sfr` | `condo` | `two_to_four`). Leave blank writes nothing and restores the next action. Structure shows `Property type` with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Purchase-contract extract still confirm-before-write for address. Never silent-write:

`The contract shows 1840 Valencia St. Suggested · not underwritten. Use this?`

Use this writes `subjectAddress` and the existing `property_address` fact (one address, not a fork). Street as extracted; city/state only if on the page. Never invent ZIP or county. No required typed-address ask. Free-text “the address is …” still confirm-before-write. If a typed address is already confirmed and the extract differs, ask once (Use document / Keep the typed one). Contract price vs sketch price stays the existing conflict-ask.

Still useful may list property type as optional, never required. Property address remains a useful remainder until a contract confirm writes it.

Readiness: empty type and house/SFR keep existing lines. Condo or 2–4 confirmed uses the UW-review line and never a strong line this gate. Do not name warrantability, HOA, or a county limit.

### Employment / time-on-job v1 — one optional duration for W-2 / both

After the property-type ask (or Skip), before the docs maze, when income is W-2 or both, Fox may ask once:

`How long have you been at this job, or in this line of work? A number is enough. Skip is fine.`

Skip / Not yet writes nothing. Self-employed only does not ask — years in business stays the existing field. Messy numbers (3, 3 years, 18 months, 6 months, since 2021, about 2 years) confirm-before-write:

`That’s about 3 years at this job. Suggested · not underwritten. Use this?`

Use this writes `statedTimeOnJob` in months. Leave blank writes nothing and restores the next action. Structure shows `Time on job` as `3 years` / `6 months` with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Paystub hire date — only if printed on the page — extract → suggest → confirm → write. Never silent-write. Never invent a start date:

`The paystub shows a hire date of March 2023. That’s about 3 years. Suggested · not underwritten. Use this?`

If a typed duration is already confirmed and the extract differs, ask once (Use document / Keep the typed one). After a confirmed hire-date extract, do not re-ask the typed question. If the page has no hire date, income confirm stays as today.

Still useful may list time on job as optional, never required. Proceed still works with the field empty.

Readiness: empty keeps existing thin / not-ready / strong / UW-review / funds-short / condo lines — no continuity problem invented. Confirmed ≥ 24 months does not claim seasoned; existing readiness stays. Confirmed < 24 months uses the UW-review line and never a strong line this gate. Condo already on UW-review stays one line. Two years is 24 months from the confirmed number, not an invented start date. Never: you don’t qualify; you need two years; invented VOE / start date / prior employer / gap.

### Current housing / present payment v1 — one optional housing number

After the time-on-job ask (or that Skip), before the docs maze, on a purchase file Fox may ask once:

`About how much do you pay now for housing? Rent or the current mortgage is enough. Skip is fine.`

Skip / Not yet writes nothing. Refinance / LCOR of the subject does not get this ask. Messy numbers (2200, $2,200, about 2200) confirm-before-write:

`That’s $2,200 a month for housing now. Suggested · not underwritten. Use this?`

Use this writes `statedCurrentHousing`. Leave blank writes nothing and restores the next action. Structure shows `Current housing` with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Mortgage-statement extract — only if a current payment is printed — extract → suggest → confirm → write. Never silent-write. Never invent a payment:

`The statement shows a current payment of about $3,400. Suggested · not underwritten. Use this?`

Unpaid principal / servicer stay the existing mortgage map. Do not double-count the subject payment into stated monthly debts. If the page has no payment, income / remainder confirm stays as today.

Still useful may list current housing as optional, never required. Proceed still works with the field empty.

Readiness is notepad only. Empty keeps existing thin / not-ready / strong / UW-review / funds-short / condo / time-on-job lines — no housing problem invented. A present number does not claim the new payment is affordable and does not invent a shock percent. Current housing alone never creates a strong line and never creates a not-ready line. Never: you don’t qualify; payment shock is X%; current housing as underwritten PITI.

### Declarations v1 — one optional credit-event fact

After the current-housing ask (or that Skip), before the docs maze, Fox may ask once:

`Any bankruptcy, foreclosure, or short sale I should know about? Skip is fine if none.`

Chips: None / Yes / Skip / Not yet. Messy typed answers (no, none, bk in 2018, I had a foreclosure) confirm-before-write. Do not interrogate year, chapter, or discharged-vs-dismissed.

None confirm:

`No bankruptcy, foreclosure, or short sale on the file. Suggested · not underwritten. Use this?`

Yes / typed event confirm:

`I’ll note a credit event for underwriting. Suggested · not underwritten. Use this?`

Use this writes `statedDeclaration` (`none` | `event`). A volunteered phrase may be a note, not an underwritten finding. Leave blank writes nothing and restores the next action. Structure shows `Declarations` as None or Something to review with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Skip / Not yet leaves the field empty. Proceed still works. Still useful may list declarations as optional, never required. Free-text mid-file uses the same confirm card — no silent write.

Readiness: empty keeps existing thin / not-ready / strong / UW-review / funds-short / condo / time-on-job lines — no credit-event problem invented. None confirmed does not claim credit is clean and does not invent a bureau pull; existing readiness stays. Event confirmed uses the existing UW-review line (`I can run this past underwriting before we go further.`) and then restores the next action. One line. If condo or time-on-job already picked UW-review, still one line. Wire the confirmed event to the existing volunteered-distress store (`namedDistress`); do not invent a parallel denial engine. Declarations alone never create a strong line. An event never creates a strong line this gate. Never: you don’t qualify; you are ineligible for conventional; invented waiting periods; invented 7-year clocks; invented chapter; you are approved; DTI percents.

### Household / buying-alone v1 — one optional household fact

After the declarations ask (or that Skip), before the docs maze, Fox may ask once:

`Are you buying this on your own, or with someone? Skip is fine.`

Chips: On my own / With someone / Skip / Not yet. Messy typed answers (just me, me and my spouse, with my partner) confirm-before-write. Do not ask their name, income, or SSN this gate.

Alone confirm:

`This file is just you. Suggested · not underwritten. Use this?`

With someone confirm:

`I’ll note more than one borrower. Suggested · not underwritten. Use this?`

Use this writes `statedHousehold` (`alone` | `with_someone`). Do not start a second borrower card. Do not invent their income. Leave blank writes nothing and restores the next action. Structure shows `Household` as On my own or With someone with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Skip / Not yet leaves the field empty. Proceed still works. Still useful may list household as optional, never required. After With someone is confirmed, still useful may later list `other borrower details` as optional — never a required maze this gate.

Readiness is notepad only. Empty / alone / with someone keep existing thin / not-ready / strong / UW-review / funds-short / condo / time-on-job / declarations lines — no household problem invented. With someone does not fire UW-review by itself. A normal co-borrower is not an exception. Household alone never creates a strong line and never creates a not-ready line. Never: you don’t qualify; your spouse must be on the loan; invented CA community-property outcome; invented second income; you are approved; DTI percents.

### Borrower identity / name v1 — one optional name

After the household ask (or that Skip), before the docs maze, Fox may ask once:

`What name should I put on this file? Skip is fine if you’ll upload an ID.`

Chips: Skip / Not yet. A typed name (Jordan Hale, it’s Jordan) confirm-before-write. If an ID is already extracted and a name is on the page, do not re-ask — offer the extract instead.

Typed confirm:

`I’ll use Jordan Hale on this file. Suggested · not underwritten. Use this?`

Use this writes `borrowerName`. Leave blank writes nothing and restores the next action. Structure shows `Borrower` with `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

Government ID extract — extract → suggest → confirm → write. Never silent-write. Never invent a name:

`The ID shows Jordan Hale. Suggested · not underwritten. Use this?`

If typed name and extract differ, ask once (Use document / Keep the typed name). If the page has no readable name, do not invent one. Never write a full SSN even if it is on the page. Never invent a DOB. A DOB may ride the same confirm card only if it is actually on the page. After a confirmed name, Fox may greet by that name when useful. Do not re-ask the typed question.

Skip / Not yet leaves the field empty. Proceed still works. Government ID stays on still useful. Borrower may appear as optional, never required.

Readiness is notepad only. Empty name does not invent a not-ready line; existing docs readiness stays. Name confirmed does not claim identity is verified and does not invent a credit pull. Name alone never creates a strong line and never creates a not-ready line. Never: you don’t qualify; SSN ask to continue; name as verified KYC; you are approved.

### Other REO v1 — one optional owned-property fact

After the name ask (or that Skip), before the docs maze, Fox may ask once:

`Do you own any other real estate besides this one? Skip is fine.`

Chips: None / Yes / Skip / Not yet. Typed `no`, `just this`, `I have a rental` confirm-before-write. Do not ask address, value, rent, or HOA this gate.

- **None** confirm: `No other real estate on the file. Suggested · not underwritten. Use this?`
- **Yes** confirm: `I’ll note other real estate. Suggested · not underwritten. Use this?` Do not start an address card. Do not invent value or rent.
- **Use this** writes `statedOtherReo` (`none` | `yes`).
- **Leave blank** writes nothing and restores the next action. If Structure previewed a pending value, Leave blank clears it.
- Structure shows `Other real estate` as None or Yes · `Suggested · not underwritten`. Editable mid-file. Start over is a full reset only.

A refinance of the subject is not other REO. On a refi path, a mortgage statement on the subject is not proof of other real estate. On a purchase file, a mortgage statement may hint Yes on the existing confirm card — never silent-write.

Skip / Not yet leaves the field empty. Proceed still works. Still useful may list other real estate as optional, never required. After Yes is confirmed, still useful may later list `other property details` as optional — never a required maze this gate.

Readiness is notepad only. Owning other property is normal. Yes does not fire UW-review by itself. Empty / none / yes keep existing thin / not-ready / strong / UW-review / funds-short / condo / time-on-job / declarations rules — no REO problem invented. Do not invent reserve months or rental income. Other REO alone never creates a strong line and never creates a not-ready line. Never: you don’t qualify; you need two months reserves; you are approved; DTI percents.

### Staff export v1 — same File, staff review only

Staff / LOS package on the existing `/lo/review` pane. Same File. No new staff app. Never a borrower 1003.

`File.export` is derived from known File facts:

- **format** `mapped_json` | `fnma_32`
- **status** `not_ready` | `gaps` | `ready` | `exported`
- **gaps[]** `{ key, why }` — missing agency fields we refuse to invent. First list: SSN, citizenship, present/mailing address, DOB, employer name if not extracted, full account numbers.
- **mapped** — known File facts only (price, loan, occupancy, name, income suggestion, debts, assets, property type, housing, declarations, household, other REO, extracted address / employer when present). Each suggested value keeps `Suggested · not underwritten`.

Status:

- **not_ready** — sketch too thin (no product + occupancy + a money number). No complete download.
- **gaps** — downloadable and honest. Normal until secure SSN capture exists.
- **ready** — required agency keys present. Rare this slice because SSN is never invented.
- **exported** — staff marked a download. Not a DU submit.

`fnma_32` is fail-closed DU 3.2 text of populated segments only. Omit empty SSN / DOB / citizenship rather than pad with zeros or fake ITIN. A file with gaps still downloads; it is labeled incomplete.

Gaps do not auto-write Still useful. A gap becomes a borrower condition only when a human writes a `foxLine`.

Borrower `/start` thread: no 1003, no export download. Free-text “did you send my file?” answers, then restores the next action. Never say “DU says,” “exported to Fannie,” or “the file is in underwriting” unless File.motion is actually waiting_out for UW.

Never invent SSN, ITIN, DOB, citizenship, income, credit score, DTI, reserve months, or matrix cells. No citizenship quiz. No present-address maze. No SSN ask on the borrower sketch.

Out of this gate: MISMO / ULAD, LOS vendor push, DU / AUS, secure SSN / DOB capture, borrower 1003.

### UX repair v1 — income stay, entry band, mobile starts

Same File. Same conversation. No new wizard. No Design system. Locked homepage ACR copy does not change.

- After W-2 or Self-employed, stay on income until the income fact is settled (qualifying income on the File, time-on-job for W-2, years in business for SE, income-docs next action, or Skip / Not yet on that income ask). Then debts may fire. Assets and the rest of the optional spine stay after income is handled.
- After a chip answer, keep the new Fox question in view. Desktop: question + chips + composer stay in one tight stack. Mobile (~390px): do not snap the viewport to the chat bar; do not require an upward scroll past Structure.
- Desktop hero keeps the side-by-side dual CTA. Mobile shows the same two starts stacked, above the fold. Footer is not the loan CTA. No third CTA. No new ACR lines.

### Quiet flags + more-complete asks

After Looks right / agency-shaped minimums, conventional files can deepen still-useful past the minimum three. HELOC and Jumbo stay thin. Never `agency_ready`.

- **W-2:** if a W-2 is already in, still useful may include `second-year W-2`.
- **Self-employed:** if a return is already in, still useful may include `prior-year return`.
- Quiet **File** line may add `still useful: ID` (and the rest of the short list).

One quiet Fox or File line — never a verdict. Do not compute DTI. Do not print a 620 cutoff. Banned: approved, eligible, ineligible, DU, AUS, you qualify, you don’t qualify, LO will contact you.

- Investment → `Pricing waits` (no `6.750%`).
- Sketched purchase LTV (loan/price) **> 97%** and ≤ 100% → `This loan is a large share of the price. I’ll keep gathering.` Looks right still possible. No denial.
- Named cash-out refinance → no preview rate.
- Named FHA / VA / USDA → no preview rate. Request human available.
- Named bankruptcy / foreclosure → no preview rate. Can still Proceed.
- Lowest credit band (`680–719`) → no preview rate.
- Loan **> purchase price** → escalate (nonsensical). Build 2 escalate rules otherwise unchanged. Request human stays a side door. Next = ONYX.

### Keep

Named amounts, `$1,249,125` ceiling, preview-rate rules, missing-doc list, no SSN/full account in facts, no LO-will-contact. Fox stays. Assigned originator is a fact. Proceed → `in_queue` → Return to Fox; in_queue chips What happens next? / Upload more / Ask Fox; Request human side door; Next = ONYX on escalate. Completeness-first three purchase money lines and confirm-before-write stay.

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
- Documents: metadata only in the browser draft (name, type, size, slot, status, receivedAt, bytesRef, extractClass). Status: `received` → `reading` → `extracted` | `needs better copy` / `failed`. Bytes live in private Vercel Blob. No public URL. No file bytes in git.
- Extraction is real BUILD 1 (Grok vision adapter). Do not invent income, SSN, account, rate, or payment numbers. Empty fields stay empty. See BUILD 1 above.
- Audit fields: `{ field, source: client | scenario | extracted-unconfirmed, confirmed }`
- Client confirm is a short card only: name, email, phone, purpose/product, value, loan amount, occupancy, income type, documents received or skipped, plus `Looks right` / `Needs a correction`. No source labels, empty extract fields, checklist, or queue UI on the client view. `/lo/review` keeps the full worksheet.
- After confirm: `Draft confirmed — pending licensed review`
- Next step: `A licensed originator will review this.`
- Draft ≠ commitment to lend. No live pricing.
- Document drop stays on `/intake`. Client draft card hides empty fields. `/lo/review` still shows empty extracts as —.
- Preview sample: `/intake?sample=loop` resets and seeds Alex Rivera + ZIP 94129 Conventional Purchase (Sample · not live). First Fox question is income bubbles. `/lo/review?sample=loop` seeds the same draft as already confirmed.

### LO review queue

`/lo/review` — internal/back-office only. Not in public nav. Not promoted on the client intake path. Discreet footer link for this preview. Label: `Internal preview — licensed review`. Same File as `/start`. Shows Status / Next / WorkItem. **Return to Fox** writes an event and one borrower-thread line. Preview sit/nudge controls live here. LO marks: `needs items` | `in review` | `contacting client`. No auth wall this slice.

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
components/MembershipHero.tsx     homepage claim + live Fox stage slot; locked copy
components/fox/homeIdle.ts        dual-path / product chip labels (same engine as /start)
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
components/fox/completeness.ts    required fields, quiet File map, confirm-before-write proposals
components/fox/motion.ts          file motion, WorkItem, sit/nudge, finish-line copy
components/fox/DocumentDrop.tsx   Fox-thread drop + real upload/extract (intake + /start)
components/fox/fileWrite.ts       write / conflict / missing-ask rules
components/fox/FilePreview.tsx    calm file card / mobile File sheet
lib/docs/accept.ts                file caps + accepted types
lib/docs/storage.ts               private Vercel Blob helpers
lib/docs/extract.ts               Grok classify + extract adapter
app/api/docs/upload               Blob handleUpload (private)
app/api/docs/extract              classify + extract (fields only)
components/fox/HeroStartLink.tsx  desktop hero pills: write path + /start
components/fox/StartWorkspace.tsx `/start` layout: URL seed + live AlwaysOnFox child
styles/start.css                  workspace layout
app/(marketing)/start/page.tsx    Fox workspace route
app/(marketing)/start/layout.tsx  mounts Always-on Fox for /start
app/api/chat                      UNCHANGED (do not call)
app/api/heloc-quote               UNCHANGED (do not call)
lib/calculate*                    UNCHANGED
lib/getProductGuideline.ts        UNCHANGED
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

Homepage path choice is the desktop hero buttons, the live Fox start on `/` (desktop and mobile), or header / closer. Product chips appear after a path is stored. There is no Relationship / Loan toggle. Intent is stored as `acr` | `loan-only` in `sessionStorage` / `localStorage` key `onyx.startPath` and carried as `path=acr` or `path=loan` on workspace, explorer, scenario, results, and intake URLs. A typed homepage turn is stored on the same draft/message list and continues on `/start`.

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
npx tsx scripts/assert-onyx-fixtures.ts
npx tsx scripts/smoke-desk.ts
```

Covers the `/start` A–D + Skip lock and the homepage → `/start` session: one engine, typed `I want to buy` keeps the turn, cold CTA still starts fresh.

ONYX test fixtures / seed uploads must be mortgage samples (paystub, W-2, ID, tax return, bank statement, purchase contract, mortgage statement). Presidio content is contamination — a leftover borrower filename belongs in the browser draft (`onyx.foxIntake.draft` `documents[].name`) or Vercel Blob, not git. The assert fails if a fixture path contains `presidio`, `p37`, `candle`, `wax`, `label-pack`, `label 5`, or `THIS IS IT`.

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
