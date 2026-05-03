# Linkly — Link Tracking SaaS

## Original Problem Statement
Build link tracking software like https://www.improvely.com/ with subscription plans & clean looking charts.

## User Choices (gathered upfront)
- Auth: Emergent-managed Google OAuth
- Payments: Stripe (test keys from pod env)
- Features chosen: trackable links + click tracking, conversion goals, dashboard charts, campaigns/projects, fraud detection
- Plans: Free / Starter $29 / Pro $79 / Business $179
- Visual style: Clean professional SaaS (Stripe / Linear inspired, light theme)

## Architecture
- Backend: FastAPI + MongoDB (Motor), single `server.py`. All routes prefixed `/api`.
- Frontend: React 19 (CRA + craco), Tailwind, Shadcn UI components, Recharts, Outfit/Manrope fonts.
- Integrations: emergentintegrations Stripe checkout, Emergent Auth `/auth/v1/env/oauth/session-data`, ipapi.co for country geolocation, parsed user-agent strings for device/OS/browser.

## Personas
- Indie marketer running paid ads needing to attribute conversions back to a campaign.
- SaaS growth team comparing channels (Twitter/Google/Newsletter).
- Affiliate manager tracking partner click quality.

## Core Requirements (static)
- Trackable short links with auto-appended UTMs and `lk_click` id.
- Click logging: IP, country, device, browser, OS, referrer, fraud score.
- Conversion goals + JS pixel.
- Dashboard with KPI tiles + combo chart (visits bar / conversions line) + breakdowns by country, device, referrer.
- Subscription plans with Stripe checkout, polling, webhook, plan upgrade.
- Google OAuth + session-cookie protected dashboard.

## What's Implemented (2026-02-03)
- Backend endpoints (all `/api`):
  - Auth: `POST /auth/session`, `GET /auth/me`, `POST /auth/logout`
  - Projects: `GET/POST /projects`, `DELETE /projects/{id}`
  - Links: `GET/POST /links`, `DELETE /links/{id}`, `GET /links/{id}/clicks`
  - Public redirect: `GET /r/{code}` (302 + click logging + UTM appending + fraud scoring)
  - Goals: `GET/POST /goals`, `DELETE /goals/{id}`
  - Conversion pixel: `POST /track/conversion`
  - Analytics: `GET /analytics/overview` (KPIs + 30-day series + breakdowns), `GET /analytics/recent-clicks`
  - Plans/Stripe: `GET /plans`, `POST /payments/checkout`, `GET /payments/status/{sid}`, `POST /webhook/stripe`
  - Demo: `POST /seed-demo`
- Frontend pages:
  - `/` Landing (hero + features grid + 4-tier pricing + CTA)
  - `/login` Google sign-in
  - `/dashboard` KPI tiles, combo chart, country/device/referrer breakdowns, demo seeder
  - `/links` create / copy / open / delete
  - `/campaigns` create / delete
  - `/goals` create / delete + pixel snippet
  - `/analytics` recent clicks table with fraud badges
  - `/billing` plan grid + Stripe checkout + status polling
- Tested: 23/24 backend pytest cases pass. 100% frontend pages render. Stripe status now resilient to "session not yet visible" errors.

## Backlog
- P0: Real per-link analytics drill-down page (open the link to view its own click history + chart).
- P1: Custom short domain support (`/r/{code}` -> `link.<custom>`)
- P1: Team seats & invitations (Business plan).
- P1: Stripe customer portal for canceling / changing plan.
- P2: Webhook receivers for downstream conversions (e.g., Stripe / Shopify).
- P2: A/B link splitting & rotators.
- P2: API tokens for programmatic link creation.

## Next Tasks
1. Add per-link drill-down page with timeline + tabular click feed.
2. Quota enforcement based on plan tier (e.g., reject link create when monthly clicks exceeded on free plan).
3. Email reports (weekly digest) — needs Resend integration.
