# ONYX build manual

Slice 1 of the redesigned onyxdirect.com. **Preview only.** Do not merge to `main`, do not promote to production, and do not assign `onyxdirect.com`.

This branch is **not** a continuation of `cursor/onyx-marketing-foundation-f26d` / PR #1. Start from these locked docs, not that foundation.

## Source of truth (locked 15 Aug 2026)

1. [`docs/ONYX-design-direction2.md`](docs/ONYX-design-direction2.md)
2. [`docs/ONYX-homepage-mockup-spec2.md`](docs/ONYX-homepage-mockup-spec2.md)

Later slices must follow those decisions. Do not invent a second palette, IA, or CTA system. Do not invent facts listed as **OPEN**.

## Slice 1 — done when

Tokens, navigation, footer, and layout foundation match on mobile and desktop. Homepage is a quiet placeholder. No hero, desks, rate card, advisor, chat orb, or sticky bar.

## File map

```
styles/tokens.css                 locked CSS variables + type ramp + buttons
styles/globals.css                reset, layout, header, footer
components/AdvisorMark.tsx        2–3 shape geometric fox, currentColor + metal
components/SiteHeader.tsx         locked sparse chrome
components/SiteFooter.tsx         sparse footer, pending-approval placeholders
app/layout.tsx                    fonts + tokens
app/(marketing)/layout.tsx        header + footer + paper canvas
app/(marketing)/page.tsx          Slice 1 placeholder only
app/(marketing)/{acr,rates,about,login,advisor}/page.tsx   stubs
app/api/chat                      UNCHANGED
app/api/heloc-quote               UNCHANGED
lib/*                             UNCHANGED
```

## Tokens

Implemented as CSS variables in `styles/tokens.css`. Hex values must match the locked `:root` block exactly. Do not add a Tailwind palette or a second color system.

Metal is scarce: fox highlight (and later ACR badge) only.

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

Open `http://localhost:3000`. Resize below 768 for the hamburger sheet. Scroll past 8px to see the header hairline. Check `/acr`, `/rates`, `/about`, `/login`.

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
- Inspector: https://vercel.com/onyx-direct/onyx-backend/3PMYvFtPDsjo6QNV2iRbeDY7oRms
- Preview may be behind Vercel Authentication. Open it signed into the ONYX Direct team.

## What later slices must not break

- Locked CTAs, desk names, fox-mark rules, and token hex values
- `app/api/chat`, `app/api/heloc-quote`, and `lib/*` unless a slice explicitly opens them
- No dashboard or returning-chat UI until that slice
- Mobile sticky bar is Slice 9, not earlier
- No invented NMLS/DRE numbers, rates, testimonials, or compliance claims
