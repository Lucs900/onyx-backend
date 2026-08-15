# ONYX homepage mockup spec

**Locked 15 August 2026.** Implement tokens and chrome from this spec. Do not build homepage sections in Slice 1.

## Tokens

```css
:root {
  --paper: #F4F1EA;
  --paper-elevated: #FFFCF6;
  --ink: #0B0B0C;
  --ink-2: #3D3833;
  --muted: #6B6560;
  --line: #E6E1D8;
  --metal: #C4A574;
  --fox: #8B3A2A;
  --ok: #2F5D50;
  --danger: #8F2D2D;
}
```

Rules: never fintech blue; never navy+gold; never pure `#000`/`#FFF` as the system; metal is scarce (ACR badge and fox highlight only); hairline borders not drop shadows; buttons are pills (`999px`); card radius `12px`; section padding `120px` desktop / `72px` mobile; content measure `680px` prose / `1120px` grids; page horizontal pad `24px` mobile / `48px` desktop then center in `1120`.

## Typography

- Display: Newsreader (Google Font variable). Fallback: Iowan Old Style, Georgia. Tracking `-0.02em` on serif.
- UI / body: Geist if it can be added cleanly, otherwise Inter. Weights `400–500`. Avoid `800` headlines.
- Numbers: `font-variant-numeric: tabular-nums`.

### Type ramp

| Role | Font | Desktop | Mobile | Weight | Color | Tracking |
| --- | --- | --- | --- | --- | --- | --- |
| Eyebrow | Geist | 12/16 | 11/16 | 500 | `--muted` | `0.12em` uppercase |
| Display H1 | Newsreader | 64/72 | 38/44 | 400 | `--ink` | `-0.02em` |
| Section H2 | Newsreader | 40/48 | 28/34 | 400 | `--ink` | `-0.02em` |
| Card title | Geist | 18/26 | 17/24 | 500 | `--ink` | — |
| Body | Geist | 16/26 | 16/26 | 400 | `--ink-2` | — |
| Small / legal | Geist | 12/18 | — | 400 | `--muted` | — |
| Stat numeral | Newsreader | 56/56 | 40/40 | 400 | `--ink` | `-0.03em` tabular |
| Button | Geist | 15/20 | 15/20 | 500 | — | `0.01em` |

Wordmark (nav): Geist 15 / 600, tracking `0.08em`, uppercase.

## Buttons

Pills. Height `48px` desktop / `52px` mobile. Pad `24px`.

- Primary = ink fill, `--paper-elevated` label. Hover fill `#1C1A18`, `200ms`.
- Secondary = transparent, `1px` ink, ink label. Hover fill `rgba(11,11,12,0.04)`.
- Focus ring: `2px` ink, `2px` offset.

Nav primary pill is `40px` tall, Geist 14/500.

## Navigation

Fixed top, `72px` desktop / `64px` mobile, `backdrop-filter: blur(12px)`, background `color-mix(in srgb, var(--paper) 86%, transparent)`, bottom hairline `1px solid var(--line)` after `8px` scroll.

### Desktop, 1120 inner

- Left: fox mark `24px` + wordmark `ONYX`. Gap `10px`. Home link.
- Center: `Rates` · `ACR` · `About` — Geist 14/500, `--ink-2`, `32px` gaps. Current: `--ink` + `1px` ink underline.
- Right: `Log in` text + `16px` + primary pill `Start your relationship` → `/acr`.
- If the locked label is too wide under `1024`, truncate nav-only to `Start` with `aria-label="Start your relationship"`.

### Mobile

- Left: fox + `ONYX`.
- Right: hamburger. **No CTA in the top bar.**
- Menu sheet: stacked Newsreader 28 links, then full-width `Start your relationship`, then `Just need a mortgage` as a text button, then `Log in`.
- Menu fade `200ms`.

## Footer

Sparse, paper ground, hairline top.

Links: Privacy, Licensing, How we get paid, NMLS Consumer Access, Equal Housing.

Do not invent NMLS/DRE numbers, rates, testimonials, or compliance claims. Mark placeholders pending approval (e.g. `NMLS ____`).

## Homepage hero (Slice 2 — locked copy)

Use exactly. Do not rewrite. No italic. No gradient on the H1. No stock photo, rate widget, or chatbot.

- Eyebrow: `Active Credit Relationship` → `ACTIVE CREDIT RELATIONSHIP`
- H1: `Always approved.` / `Always optimizing.`
- Support: `We keep your credit and rate working for you.`
- Primary: `Start your relationship` → `/acr` (56px)
- Secondary: `Just need a mortgage` — switches Spotlight to Loan and scrolls to it (48px desktop / 52px mobile)
- Trust: `NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.`
- Link: `Here’s how we get paid.`
- Optional OPEN microcopy `Live data · no hard credit check` — omit if it does not fit the locked layout
- ACR pass: CSS only, 420×264 desktop rotate -6deg; mobile max 320 rotate -3deg. Member pass, not a Visa. No name, last-4, hologram, or facial fox.

## Advisor Spotlight (Slice 3)

Centered under the hero. Stack: mode toggle → composer → chips → disclosure. Section pad `80` / `64`. Max width `720`.

- Toggle: `Relationship` | `Loan`. Height 36, pad 3, paper-elevated, 1px `--line`, radius 999. Default Relationship. Active ink fill, paper label. Thumb 200ms. Not Advisor vs Classic.
- Composer: pill 56 / 52, paper-elevated, 1px `--line`, radius 999, pad `8 8 8 20`. `<AdvisorMark size="sm" />` 20px. Send 40×40 ink, disabled until text.
- Placeholders: `Ask about your status, credit, or ACR.` / `Ask about buying, refinancing, or equity.`
- Relationship chips: `What’s ACR?` · `How do you keep me approved?` · `What does optimizing mean?`
- Loan chips: `Buy a home` · `Refinance` · `Use equity`
- Disclosure as locked in the direction doc. Loan adds text link `Prefer a short form` (no-op this slice).
- Default preview: Relationship, first chip selected, empty input. No fake transcript.

## Membership math / three desks (Slice 4)

Below Advisor Spotlight. Eyebrow `THE RELATIONSHIP`. H2 `Unlock $—+ in annual relationship value.` (`$X+` is OPEN — never invent a dollar amount). Body `Live credit and rate data. Three desks. One relationship.` Quiet `Sample · not live`.

Three equal static-open cards: paper-elevated, 1px `--line`, radius 12. No icons. No metal. Locked names: The Rate Desk, The Credit Path, The Member Desk.

## Homepage sections (later slices)

Do not invent a second IA.

- Rate card
- Comparison table
- How it works
- Proof
- Closer
- `/acr` product page
- Returning chat
- Mobile sticky bar (Slice 9)

## Motion

Honor `prefers-reduced-motion`. No custom cursor. No page wipes.

## OPEN

Do not invent facts listed as OPEN: license numbers, live rates, testimonials, unapproved compliance copy, and any hero/section copy not locked in this document or `ONYX-design-direction2.md`.
