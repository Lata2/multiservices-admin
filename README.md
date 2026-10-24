# Servio Console — Admin & Super Admin panels

Production-ready **frontend** for running the Servio home-services marketplace
(customer, provider and delivery apps). One codebase, one design system, two panels:

| Panel | URL | Who |
| --- | --- | --- |
| **Admin** | `/admin` | Operations, finance, support and city teams. What each person sees depends on their role. |
| **Super Admin** | `/super` | Platform owners: everything in Admin, plus team, roles, global settings, cities, analytics, audit and system controls. |

> **Demo mode.** There is no backend yet. A typed service layer runs against an
> in-browser mock database with realistic data (≈800 bookings over 12 months, 160
> customers, 24 providers, payouts, tickets, reviews…). Sign-in, roles and city
> scoping are **simulated in the browser and are not a security boundary**. The real
> API must enforce every rule (see `docs/BACKEND_INTEGRATION.md`).

## Quick start

Requires **Node.js 20.19+ or 22.12+**.

```bash
npm install
cp .env.example .env.local     # optional; defaults work out of the box
npm run dev                    # http://localhost:5174
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check + optimised production build in `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4174 |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | oxlint |
| `npm test` | Unit tests (Vitest): seed integrity, RBAC, city scoping, booking/refund/payout rules, pagination, CSV safety |
| `npm run e2e` | Playwright: user flows plus a crawl of every route at 5 screen sizes (desktop 1440, laptop 1024, tablet 768, Pixel 7, 360px phone) checking runtime errors and horizontal overflow |
| `npm run check` | typecheck + lint + unit tests + build |

For e2e, run `npx playwright install chromium` once, or set `CHROME_PATH=/path/to/chromium`.

## Demo accounts

Password for all accounts: **`Demo@1234`**. The login page has one-click fill buttons.

| Account | Role | Panel | Notes |
| --- | --- | --- | --- |
| `superadmin@servio.app` | Super Admin | `/super` | 2-step verification: code **`123456`** |
| `admin@servio.app` | Operations Admin | `/admin` | Every admin module |
| `finance@servio.app` | Finance Manager | `/admin` | Payments, refunds, payouts, reports |
| `support@servio.app` | Support Agent | `/admin` | Tickets, bookings, review moderation |
| `citymanager@servio.app` | City Manager | `/admin` | Only sees **Mumbai & Pune** data |

Data changes persist in `localStorage`. **Super Admin → System → Reset demo data**
restores the original dataset, and so does clearing site data.

## Modules

**Shared by both panels (permission-gated)**

- **Dashboard.** KPIs with trends and sparklines, a "needs attention" strip, the 30-day bookings/GMV chart, status mix, today's schedule, top categories and providers.
- **Bookings.** Status tabs with counts; filters for city, category, payment and date; server-style search, sort and pagination; CSV export. The detail page shows the timeline and supports status changes (enforcing the app's status flow), reassigning a provider, rescheduling, cancel with refund, partial refunds and internal notes.
- **Dispatch.** Pickup, drop and parts delivery tasks. Assign, reassign or unassign a partner from the same city (online partners listed first), cancel a task, see COD amounts.
- **Support desk.** Split inbox. Assign, prioritise and resolve tickets, reply to the user or add internal notes, use quick replies.
- **Customers.** Segments, profile, bookings, wallet and tickets. Block or unblock, and goodwill wallet credit or debit.
- **Providers.** KYC review (verify or reject each document), approve, reject, suspend or reinstate, commission and visiting charge, featured flag, services on/off, bookings, payouts and reviews.
- **Delivery partners.** Approval, suspension (this returns their assigned tasks to Dispatch), task history.
- **Categories and services.** Category tree with commission, icon, featured flag and order. Services can be edited (price, offer price, includes) and switched on or off.
- **Payments.** Collections, refunds, commission and tax, the payment-method mix, and a full transactions ledger with export.
- **Payouts.** Approve, pay (with a UTR reference), reject with a reason, or bulk-pay selected requests.
- **Reports.** 7D, 30D, 90D or 12M, per city, compared with the previous period. GMV, revenue, AOV, completion, repeat rate, peak hours, and category, city, provider and service tables, with CSV exports and print.
- **Promo codes, banners and broadcasts.** Validated forms. Banners have a live preview, ordering and CTR. Broadcasts show estimated reach, a phone preview, scheduling and drafts.
- **Reviews.** Rating distribution; publish, hide or delete reviews; a flagged queue.
- **Content.** FAQs per app audience, and legal pages with an editor and preview.
- **Notifications, and profile and security.** Profile, password with a strength meter, 2-step verification and theme.

**Super Admin only**

- **Platform overview.** 12-month GMV and revenue, cities, system health, admin activity and recent audit entries.
- **Analytics.** Booking funnel, monthly retention cohorts, weekday × hour heatmap, demand per provider, customer growth, rating trend and city benchmarks.
- **Admin team.** Invite admins, edit role and city scope, suspend, remove, resend invites. Safeguards stop you locking yourself out and require at least one active Super Admin.
- **Roles and permissions.** Permission matrix with 30 permissions in 6 groups, plus custom roles. Platform permissions are reserved for Super Admin.
- **Global settings.** Tax, commission, booking rules, payouts, payment methods, referrals and notification channels, with validation and a sticky save bar.
- **Cities and zones.** Launch or pause a city, set its radius, see per-city supply and demand.
- **System.** Maintenance mode, live service health, feature flags with % rollout, mobile app minimum versions and force-update, and the demo-data reset.
- **Audit log.** Every mutation is recorded with admin, role, IP and severity. Filters and CSV export.

**Also included:** ⌘K / Ctrl+K command palette, a collapsible sidebar, a mobile
drawer, light/dark/system theme, URL-synced filters (shareable views), toasts, focus-trapped
dialogs, and skeleton, empty and error states on every view.

## Tech stack

React 19 · Vite 8 · TypeScript 7 (strict) · Tailwind CSS 4 · TanStack Query 5 ·
React Router 8 · Zustand 5 · React Hook Form + Zod 4 · Recharts 3 · lucide icons ·
Plus Jakarta Sans (self-hosted) · Vitest · Playwright · oxlint.

## Project structure

```
src/
  app/            App, router (lazy routes for both panels), query client, navigation config
  config/         env.ts (runtime config), theme.ts (chart palette + tone classes)
  styles/         theme.css: THE design-token file (colours, type, radii, shadows, motion, dark mode)
  components/
    ui/           Button, Card, Badge, Avatar, Input/Select/Textarea/Switch/Checkbox/Segmented,
                  Dialog/Drawer/ConfirmDialog, Menu, Tabs, DataTable (table ↔ mobile cards),
                  Pagination, StatCard, PageHeader, states (skeleton/empty/error), Toaster
    charts/       AreaTrend, LineTrend, BarSeries, Donut, Heatmap, Funnel, Sparkline
    layout/       AppShell, Sidebar, Topbar, CommandPalette, route guards
    domain/       booking timeline, price summary, lookup selects, list helpers
  features/       one folder per module (dashboard, bookings, providers, finance, super/…)
  hooks/          TanStack Query hooks, query keys, URL table state, permissions, mutations
  services/       http client, session, mock "server" utilities, api/* typed service modules
  mocks/          deterministic seed generator + persisted in-memory DB
  lib/            permissions catalogue, status metadata, formatting, CSV, helpers
  types/          domain models (shared with the mobile apps) and admin types
e2e/              Playwright specs
docs/             backend integration guide
```

## Theming

Every visual token lives in **`src/styles/theme.css`**: the brand scales (Royal Blue
primary, Saffron accent and Oxford neutrals from the Servio app), feedback colours,
semantic surface and text tokens for light and dark mode, the type scale, radii, shadows,
layout widths and animations. Components only use utilities generated from these tokens,
so changing a value re-themes both panels. The panel accent (`--panel-*`) is blue for Admin
and violet for Super Admin. Chart colours read the same CSS variables
(`src/config/theme.ts`).

## Access control model

- A **role** is a named set of permissions (`src/lib/permissions.ts`). Every admin has one role.
- The **panel** comes from the role: Super Admin → `/super`, everyone else → `/admin`.
- **Navigation, routes and buttons** are filtered by permission. A direct URL to a
  forbidden page shows an "access denied" state.
- **City scope** limits an admin's data to their assigned cities (applied in the service layer).
- The mock backend enforces the same rules (403/404) so the UI handles real failures.
  **In production the API must enforce them. The frontend checks are UX only.**

## Deploying

`dist/` is a static single-page app, so every route (`/login`, `/admin/...`) must serve
`index.html`. This is already configured for **Vercel** (`vercel.json`, framework preset
"Vite", output `dist`) and **Netlify** (`public/_redirects`). Nginx: `try_files $uri /index.html;`.
Cache `dist/assets/*` long-term (the file names are hashed) and don't cache `index.html`.
