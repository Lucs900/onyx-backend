# ONYX design direction

**Locked 15 August 2026.** This is a source of truth. Do not invent a second system.

## Positioning

- **ACR-first.** The Active Credit Relationship is the product.
- A mortgage is available without ACR.
- Chat-first for returning clients. Dashboard is later. Do not build a dashboard until that slice is opened.

## Locked names

Desks (do not rename):

1. The Rate Desk
2. The Credit Path
3. The Member Desk

Do not build the desk cards until that slice is opened.

## Locked homepage CTAs

Do not revert these labels.

| Role | Label | Destination | Notes |
| --- | --- | --- | --- |
| Primary | `Start your relationship` | `/acr` | Nav and hero. Under 1024, nav-only label may truncate to `Start` with `aria-label="Start your relationship"`. Never “Get my rate”. |
| Secondary | `Just need a mortgage` | loan-only Advisor later | Hero: button, no navigation this slice. Mobile menu: text button. |

## Mark

Geometric fox. **2–3 shapes only.** `currentColor`. Default ink.

- No pupils, smile, wink, eyebrows, full body, or facial expression.
- Must read at 16 / 24 / 32 / 64.
- **Metal highlight only on the mark.** Metal is otherwise scarce (ACR badge + fox highlight only).

## Visual rules

- Never fintech blue.
- Never navy + gold.
- Never pure `#000` / `#FFF` as the system.
- Hairline borders. No drop shadows.
- Buttons are pills (`border-radius: 999px`).
- Card radius `12px`.
- Section padding `120px` desktop / `72px` mobile.
- Content measure `680px` prose / `1120px` grids.
- Page horizontal pad `24px` mobile / `48px` desktop, then center in `1120`.
- Honor `prefers-reduced-motion`.
- No custom cursor.
- No page wipes.

Palette lives in `styles/tokens.css`. Do not invent a second palette.

## Chrome (locked sparse)

Fixed top nav: `72px` desktop / `64px` mobile. Backdrop blur `12px`. Background `color-mix(in srgb, var(--paper) 86%, transparent)`. Bottom hairline after `8px` scroll. Menu fade `200ms`.

Desktop inner `1120`: fox `24px` + wordmark `ONYX` · center `Rates` · `ACR` · `About` · right `Log in` + primary pill.

Mobile: fox + `ONYX` left, hamburger right. **No CTA in the top bar.** Sheet: stacked Newsreader 28 links, then full-width primary, then `Just need a mortgage` text button, then `Log in`.

Footer: sparse, paper, hairline top. Links: Privacy, Licensing, How we get paid, NMLS Consumer Access, Equal Housing.

## Compliance — do not invent

These are **OPEN** until approved. Placeholders must be marked pending approval.

- NMLS number (use `NMLS ____`)
- DRE number
- Rates
- Testimonials
- Any compliance claim presented as final

Advisor / legal line allowed as placeholder:

> ONYX can make mistakes. “Always approved” is the relationship goal, not a credit decision.

## Locked homepage hero (Slice 2)

Use exactly. Do not rewrite.

- Eyebrow: `Active Credit Relationship` (display uppercase)
- H1: `Always approved.` / `Always optimizing.`
- Support: `We keep your credit and rate working for you.`
- Primary → `/acr`. Secondary is a no-op button until Advisor loan-only mode.
- Trust: `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.`
- Link: `Here’s how we get paid.`
- No rate or “get pre-approved” in the hero.
- “Always approved” is the relationship goal, not a credit decision.

## Out of scope until a later slice

Advisor Spotlight, membership math, rate card, comparison table, how-it-works, proof, closer, `/acr` product page, returning chat, mobile sticky bar (Slice 9), dashboard, Advisor conversation UI.

## OPEN

Anything not locked above is **OPEN**. Do not invent facts, copy, numbers, or a second visual system to fill gaps.
