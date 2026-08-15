# ONYX Direct marketing site — living build manual

This document is the working manual for the **marketing foundation** of ONYXdirect.com. It lives on the feature branch and should be updated whenever architecture, routes, or advisor wiring change.

**Status:** feature-branch preview only. Do not treat this as a production cutover. Do not merge or deploy to the live domain until a human explicitly approves it.

## What this repo is

`Lucs900/onyx-backend` is a Next.js 14 App Router project that already hosts:

- The **ONYX Advisor / Equity Fox** chat (`POST /api/chat`)
- The **HELOC quote** API (`POST /api/heloc-quote`)
- Calculation tools in `lib/` used by those APIs

This branch adds a marketing website **around** those pieces. The homepage is no longer the raw chat UI. The advisor is extracted and remains first-class.

## Product idea (do not dilute)

ONYX Direct is a **California residential mortgage company**.

The real product is an **Active Credit Relationship (ACR)**:

- The ONYX fox (Equity Fox) is an **ongoing membership-based advisor** for debt, credit, and equity — not a one-time loan helper.
- After a client makes **six mortgage payments**, they receive **rewards money** that can be used to pay down debt, make mortgage payments, or similar goals.
- The fox keeps optimizing credit, reducing debt, building equity, and keeping clients at strong approval levels.

When writing copy or IA, prefer the fox-as-advisor and the rewards/membership loop over a generic “we do loans” story.

## How to run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The advisor and HELOC quote routes need environment variables (already used in production; do not commit them):

| Variable | Used by | Notes |
|---|---|---|
| `POSTGRES_URL` | `/api/chat` | Knowledge base + conversation save |
| `grok_api_key` | `/api/chat` | xAI / Grok via OpenAI-compatible SDK |
| `TURNSTILE_SECRET_KEY` | `/api/heloc-quote` | Optional captcha verify |

```bash
npm run build
npm start
```

## How to deploy (preview only on this work)

The GitHub repo is linked to the Vercel project **`onyx-backend`** on team **ONYX Direct**.

- A pull request against `main` should create a **preview** deployment automatically.
- Do **not** promote this branch to Production or point `onyxdirect.com` at it from this workstream.
- `vercel.json` is unchanged: Next.js framework, `npm run build`, `.next` output.

If a preview URL does not appear on the PR, open the Vercel project → the git branch → Preview, or ask a project admin to confirm Git integration. Do not run a production deploy to “make a URL.”

## Architecture

```
app/
  layout.tsx              Shared chrome: fonts, Header, Footer, AdvisorProvider, ChatWidget
  page.tsx                Marketing home
  products/page.tsx
  how-it-works/page.tsx
  about/page.tsx
  contact/page.tsx        Client form → shared advisor conversation
  contact/layout.tsx      Metadata only
  advisor/page.tsx        Dedicated “Talk to the fox” room
  not-found.tsx
  globals.css             Tailwind + tokens
  icon.svg
  api/chat/route.ts       UNCHANGED advisor bot
  api/heloc-quote/route.ts UNCHANGED quote API
components/
  layout/                 Header, Footer
  advisor/                Chat UI, widget, shared conversation state
  brand/                  Equity Fox mark
  ui/                     Button, Container, PageHero
content/
  site.ts                 Nav, Floify URL, contact goals
  products.ts             Full product list + copy
lib/                      UNCHANGED calculation tools
public/knowledge/         Existing lender knowledge files (not rewritten)
BUILD_MANUAL.md           This file
```

### Visual system

- Tailwind CSS 3 with tokens in `tailwind.config.ts` and `app/globals.css`
- Fonts via `next/font`: **Source Serif 4** (display) and **Source Sans 3** (UI)
- Palette: onyx black, warm cream, fox copper
- No giant inline-style pages. Shared layout, nav, and footer on every marketing route.

### Information architecture

| Route | Purpose |
|---|---|
| `/` | Home — ACR, six-payment rewards, product teaser, advisor CTA |
| `/products` | Full product list |
| `/how-it-works` | Fox + ACR membership loop |
| `/about` | Company posture; no invented licenses or testimonials |
| `/contact` | Get started — form seeds the advisor; Floify for apply |
| `/advisor` | Full-page Equity Fox (widget hidden here) |

Primary nav includes all five marketing pages. **Talk to the fox** is a persistent header CTA plus the floating widget.

## Advisor bot wiring

The homepage used to be a client component that POSTed to `/api/chat`. That behavior is preserved.

1. `AdvisorProvider` (`components/advisor/AdvisorProvider.tsx`) holds messages, input, loading, and widget open state for the visit.
2. `EquityFoxChat` renders the thread and still POSTs:

   ```http
   POST /api/chat
   Content-Type: application/json

   { "message": "<latest user text>", "history": [ { "role": "bot"|"user", "content": "..." } ] }
   ```

3. The API is unchanged. It still:
   - Loads knowledge from Postgres (`rates`, `matrix`, `fees`, `prime_rate`)
   - Calls Grok (`grok-3`) with HELOC tools from `lib/`
   - May save a transcript when an email or Floify link appears
4. Surfaces:
   - Floating **Talk to the fox** widget on every page except `/advisor`
   - Dedicated `/advisor` room
   - Contact form composes a first user message and `sendMessage()`s it, then routes to `/advisor`
5. Custom event `onyx:open-advisor` can open the widget. Session key `onyx-advisor-seed` can still seed a first message on first mount.

Do not change the request/response shape without updating this manual and testing `/api/chat` against production knowledge.

## Existing backend — do not break

Leave these alone unless there is an explicit, separate task:

- `app/api/chat/route.ts`
- `app/api/heloc-quote/route.ts`
- `lib/calculateDti.ts`
- `lib/calculateHelocQuote.ts`
- `lib/calculatePayment.ts`
- `lib/getProductGuideline.ts`

`/api/heloc-quote` remains a CORS-enabled, rate-limited direct calculator (Turnstile optional). It is independent of the marketing pages.

## ACR-related features on this branch

- Home, How it Works, About, and footer copy center ACR + six-payment rewards
- Product copy frames every loan type as a tool inside the relationship
- Advisor greeting mentions the ongoing advisor role and six-payment rewards
- Contact goals include starting an ACR and rewards questions
- No invented rates, NMLS numbers, testimonials, or “we are licensed in X” claims
- Footer compliance line is clearly marked **placeholder — pending approval**

## Compliance and copy rules

- Do not invent rates, licenses, NMLS IDs, testimonials, or equal-housing claims as if they were live.
- Placeholder footer/contact lines must stay labeled as pending approval.
- Do not edit live production compliance language on `main` from this branch.
- Floify application URL is the existing portal: `https://onyxdirect.floify.com/`

## How future changes should be made

1. Branch off `main` (or this feature branch if the foundation is still unmerged). Never commit marketing experiments straight to `main` unless that is an explicit production task.
2. Keep API routes and `lib/` calculation tools stable. Marketing pages should consume them, not fork them.
3. Put shared copy in `content/`. Put shared chrome in `components/layout` and `components/ui`.
4. If you add a product, add it to `content/products.ts` so Home teasers and the Products page stay in sync.
5. If you change advisor UX, keep the `/api/chat` contract and update this manual.
6. If you add real contact details, licenses, or NMLS copy, replace the placeholder labels — do not leave fake numbers in.
7. Preview on Vercel. Do not assign the production domain until cutover is a conscious release.
8. Update `BUILD_MANUAL.md` in the same PR as the behavior change.

## Git / backup

- Work for this foundation lives on a **feature branch**, not `main`.
- If you snapshot, **tag the feature branch**, never `main`, so production history stays untouched.
- This file is the living backup of intent, file map, and advisor wiring.

## Current branch intent

Marketing foundation + extracted advisor. Not a replacement of the live HELOC site until product and compliance sign off.
