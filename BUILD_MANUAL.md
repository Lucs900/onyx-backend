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

Locked copy — do not rewrite:

- Eyebrow: `Active Credit Relationship` (rendered uppercase)
- H1: `Always approved.` / `Always optimizing.`
- Support: `We keep your credit and rate working for you.`
- Primary: `Start your relationship` → `/acr`
- Secondary: `Just need a mortgage` — `<button>` no-op. Do not navigate. Advisor sheet is later.
- Trust: `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.`
- Link: `Here’s how we get paid.` → `/how-we-get-paid`
- Optional `Live data · no hard credit check` was omitted; it does not have a slot in the locked layout.

“Always approved” is the relationship goal, not a credit decision. No rate and no “get pre-approved” in the hero.

Pass: CSS only (`AcrPass`). No Three.js. Desktop 420×264, −6deg, recessed ellipse, conic metal sheen on hover. Mobile max 320, −3deg. Honor `prefers-reduced-motion`.

## File map

```
styles/tokens.css                 locked CSS variables + type ramp + buttons
styles/globals.css                reset, layout, header, footer
styles/hero.css                   Slice 2 hero + pass
components/AdvisorMark.tsx        2–3 shape geometric fox, currentColor + metal
components/SiteHeader.tsx         locked sparse chrome
components/SiteFooter.tsx         sparse footer, pending-approval placeholders
components/MembershipHero.tsx     locked hero
components/AcrPass.tsx            CSS membership pass
app/layout.tsx                    fonts + tokens
app/(marketing)/layout.tsx        header + footer + paper canvas
app/(marketing)/page.tsx          hero only (no other homepage sections)
app/(marketing)/{acr,rates,about,login,advisor}/page.tsx   stubs
app/api/chat                      UNCHANGED
app/api/heloc-quote               UNCHANGED
lib/*                             UNCHANGED
```

## Tokens

Implemented as CSS variables in `styles/tokens.css`. Hex values must match the locked `:root` block exactly. Do not add a Tailwind palette or a second color system.

Metal is scarce: fox highlight and ACR pass metal only.

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

Open `http://localhost:3000`. Confirm the hero + pass on desktop (two columns) and mobile (stack, pass between copy and CTAs). Secondary hero button must not navigate.

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

Advisor Spotlight, membership math / three desks, rate card, comparison, how-it-works, proof, closer, `/acr` product page, returning chat, mobile sticky bar (Slice 9), dashboard, Advisor sheet.

## What later slices must not break

- Locked CTAs, desk names, fox-mark rules, token hex values, and Slice 2 hero copy
- `app/api/chat`, `app/api/heloc-quote`, and `lib/*` unless a slice explicitly opens them
- No dashboard or returning-chat UI until that slice
- Mobile sticky bar is Slice 9, not earlier
- No invented NMLS/DRE numbers, rates, testimonials, or compliance claims
