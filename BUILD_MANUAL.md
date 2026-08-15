# ONYX build manual

Redesigned onyxdirect.com on `cursor/onyx-slice-1-shell-8e97` / PR #2. **Preview only.** Do not merge to `main`, do not promote to production, and do not assign `onyxdirect.com`.

This branch is **not** a continuation of `cursor/onyx-marketing-foundation-f26d` / PR #1. Start from these locked docs, not that foundation.

## Source of truth (locked 15 Aug 2026)

1. [`docs/ONYX-design-direction2.md`](docs/ONYX-design-direction2.md)
2. [`docs/ONYX-homepage-mockup-spec2.md`](docs/ONYX-homepage-mockup-spec2.md)

Later slices must follow those decisions. Do not invent a second palette, IA, or CTA system. Do not invent facts listed as **OPEN**.

## Slice 1 — shell

Tokens, navigation, footer, and layout foundation. Keep this chrome.

## Slice 2 — hero + ACR pass

Homepage first screen is ACR-first: locked eyebrow / H1 / support, dual CTAs, in-hero broker line, CSS membership pass.

Hero secondary `Just need a mortgage` now switches Slice 3 to Loan mode and scrolls to it.

## Slice 3 — Advisor Spotlight

Centered section under the hero. Stack: toggle → composer → chips → disclosure.

- Toggle: `Relationship` | `Loan`. Default **Relationship**. Not Advisor vs Classic.
- Composer uses `<AdvisorMark size="sm" />` (20px). Send disabled until there is text. Submit is a quiet no-op — no homepage transcript, no `/api/chat` wiring.
- Chips fill the composer. Default preview: Relationship, first chip selected, empty input.
- Loan disclosure includes no-op `Prefer a short form`. Do not build the Classic form this slice.

Disclosure, exact:

- Relationship: `ONYX Advisor · AI · I can’t approve a loan in this chat.`
- Loan: `ONYX Advisor · AI · Loan-only. ACR is optional. I can’t approve a loan in this chat.`

## Slice 4 — Membership math (The Three Desks)

Section below Advisor Spotlight. Static open cards. No accordion. No icons. No metal.

- Eyebrow: `THE RELATIONSHIP`
- H2: `Unlock $—+ in annual relationship value.`
- `$X+` is still **OPEN**. Do not invent a dollar amount. Preview uses `$—+` and `Sample · not live`.
- Body: `Live credit and rate data. Three desks. One relationship.`
- Locked names: **The Rate Desk**, **The Credit Path**, **The Member Desk**

## Slice 5 — Rate card + comparison

Below the three desks.

Rate card is the mortgage-without-ACR off-ramp:

- Eyebrow `MORTGAGE ONLY`. No section H2.
- APR / decision / amount / as-of remain **OPEN**. Preview uses `—` and `Sample · not live`. Do not invent a live rate.
- Product line may show `Purchase · 30-year fixed` only as a labeled sample.
- CTA `Find my rate` (56px) with `2 min · no hard credit check` switches Advisor Spotlight to **Loan** mode — same path as hero `Just need a mortgage`.
- Exact line under the card: `A mortgage is available without ACR.`

Comparison: Feature | ONYX ACR | Traditional lender | Loan only. ONYX column uses a 6px metal underline (allowed metal besides fox/pass). Member credits stay an em dash. Mobile uses stacked cards.

## Slice 6 — How it works + proof + closer

How it works: `THE PATH` / `Get approved. Then stay that way.` Five steps. Emphasize Approve → Optimize → Stay in the desk. Caption under 03: `Loan-only can stop here.`

Proof: four OPEN placeholders (`—`), `Sample · not live`, `As of —`. No invented volume, stars, quotes, or GSE logos. Trust marks: Equal Housing, NMLS Consumer Access, Mortgage broker.

Closer: locked H2 `Always approved. Always optimizing.` Primary → `/acr`. Secondary → Loan Spotlight. `Talk to a licensed originator` + `NMLS ____`. Repeat `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.` Mobile sticky bar is Slice 9, not this slice.

## File map

```
styles/tokens.css                 locked CSS variables + type ramp + buttons
styles/globals.css                reset, layout, header, footer
styles/hero.css                   Slice 2 hero + pass
styles/spotlight.css              Slice 3 Advisor Spotlight
styles/desks.css                  Slice 4 three desks
styles/rates.css                  Slice 5 rate card + comparison
styles/close.css                  Slice 6 path, proof, closer
components/AdvisorMark.tsx        2–3 shape geometric fox; size="sm" = 20px
components/SiteHeader.tsx         locked sparse chrome
components/SiteFooter.tsx         sparse footer, pending-approval placeholders
components/MembershipHero.tsx     locked hero; secondary → Loan spotlight
components/AcrPass.tsx            CSS membership pass
components/AdvisorSpotlight.tsx   toggle, composer, chips, disclosure
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
app/(marketing)/{acr,rates,about,login,advisor}/page.tsx   stubs
app/api/chat                      UNCHANGED
app/api/heloc-quote               UNCHANGED
lib/*                             UNCHANGED
```

## Tokens

Implemented as CSS variables in `styles/tokens.css`. Hex values must match the locked `:root` block exactly. Do not add a Tailwind palette or a second color system.

Metal is scarce: fox highlight, ACR pass, and the comparison ONYX underline only.

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

## Still later — do not build yet

`/acr` product page, returning chat, mobile sticky bar (Slice 9), dashboard, Advisor sheet, Classic form widget.

## What later slices must not break

- Locked CTAs, desk names, fox-mark rules, token hex values, Slice 2 hero copy, Slice 3 disclosure copy
- `$X+`, APR, decision time, amount, and as-of date stay OPEN until approved
- `app/api/chat`, `app/api/heloc-quote`, and `lib/*` unless a slice explicitly opens them
- No dashboard or returning-chat UI until that slice
- Mobile sticky bar is Slice 9, not earlier
- No invented NMLS/DRE numbers, rates, testimonials, or compliance claims
