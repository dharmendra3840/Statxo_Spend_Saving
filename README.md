# Spend & Saving Analytics Platform

A full-stack application for analysing organisational spend: budget vs actual,
savings and overspend, across business units, categories, vendors and locations.

**Live URL:** _to be added on deployment_

### Test credentials

```
Email:    evaluator@statxo.demo
Password: StatxoDemo#2026
```

---

## Contents

1. [Overview](#overview)
2. [Technology stack](#technology-stack)
3. [On the backend requirement](#on-the-backend-requirement)
4. [Features](#features-mapped-to-the-brief)
5. [Assumptions](#assumptions)
6. [Observations about the sample data](#observations-about-the-sample-data)
7. [Design decisions](#design-decisions)
8. [Setup](#setup)
9. [Database setup](#database-setup)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Known limitations](#known-limitations)

---

## Overview

Login → Dashboard → Records → Add/Edit → Dashboard updates.

- **Dashboard** — six global filters driving 8 KPI cards, 5 chart types and 8
  generated insights.
- **Records** — the raw spend table with search, sorting, per-column filtering,
  pagination, column resizing, reordering, pinning and show/hide, plus inline
  editing of Budget, Actual Spend and Category.
- **Add / Delete** — modal form with validation and live calculated values;
  delete behind a confirmation step.

Every view reads from one shared records array, so an edit in the table moves the
KPI cards, charts and insights in the same interaction.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | One repository and one deployment for frontend and backend |
| Language | TypeScript (strict) | The money columns are the easiest thing to get subtly wrong |
| UI | Tailwind CSS v4 | No component library — the components here are small and specific |
| Table | TanStack Table v8 | Supplies resizing, reordering, pinning, visibility, sorting, filtering and pagination as headless state |
| Charts | Recharts 3 | All five required chart types in one declarative API |
| Validation | Zod 4 | One schema shared by the client form and the server route |
| Database | Supabase (PostgreSQL) | Hosted Postgres with row-level security |
| Auth | Supabase Auth, email + password | Cookie sessions that work with server-side rendering |
| Hosting | Vercel | Native Next.js target |

TanStack Table is pinned to **v8** deliberately. v9 is published and resolves by
default, but it exposes a different feature-module API (`useTable` +
`columnPinningFeature`), and v8 is what the ecosystem and documentation describe.

## On the backend requirement

The brief asks for *"Node.js/Express or an equivalent backend technology"*.

This uses **Next.js Route Handlers**, which are server-side handlers running on
the Node.js runtime — the same request/response model as Express routes, and the
place all database access, authentication and validation live. The API routes
declare `export const runtime = "nodejs"` explicitly so this is literal rather
than arguable.

```
GET    /api/records       list all records
POST   /api/records       create (validated server-side)
PATCH  /api/records/:id   update budget / actual spend / category
DELETE /api/records/:id   delete
```

Each handler calls `supabase.auth.getUser()` itself and returns 401 without a
valid session. The proxy (middleware) protects *pages*; it does not protect
*data*, because a direct request to `/api/records` never passes through a page
route. Both layers are present.

## Features mapped to the brief

| Brief | Status | Notes |
|---|---|---|
| 1. Login / Logout, protected dashboard | ✅ | Supabase Auth; test user below |
| 2. Six global filters, combinable, Reset | ✅ | Date range, Business Unit, Category, Vendor, Location, Status |
| 3. ≥ 6 KPI cards | ✅ | 8 cards |
| 4. Charts — Line, Bar, Pie/Donut, Stacked Bar, Area | ✅ | All five |
| 4. ≥ 6 insights, filter-aware | ✅ | 8 generated insights |
| 5. Table: search, sort, filter, pagination | ✅ | Global search + per-column filters |
| 5. Column resize / reorder / pin / show-hide | ✅ | Layout persists to `localStorage` |
| 5. Inline edit Budget / Actual Spend / Category | ✅ | Optimistic, with rollback on failure |
| 6. Add Record modal, validation, calculated values | ✅ | Live Savings / Savings % / Status preview |
| 7. Sample data | ✅ | All 20 rows seeded via migration |
| 8. Backend + database, auth and CRUD APIs | ✅ | See above; full CRUD including delete |
| 9. Responsive frontend, loading / empty / error states | ✅ | Skeletons, empty states, toasts, error boundaries |
| 10. Deployment | ⬜ | See [Deployment](#deployment) |

Additions beyond the brief: CSV export of the filtered set, delete with
confirmation, URL-encoded filter state (shareable links), and automated test
suites.

## Assumptions

Recorded here because the sample sheet leaves several things open.

| # | Assumption | Rationale |
|---|---|---|
| A1 | Currency is INR, formatted `en-IN` with lakh grouping | All locations are Indian; no currency column was supplied |
| A2 | **Status is derived**, not stored: `actual > budget ? 'Over Budget' : 'Approved'` | Reproduces all 20 sample values exactly, and stays correct after an inline edit |
| A3 | Savings may be negative; overspend is shown in red rather than clamped to zero | Overspend is the signal the platform exists to surface |
| A4 | Savings % is `null` (rendered `—`) when budget is 0 | Prevents `NaN` / `Infinity` reaching the UI |
| A5 | Business Unit is independent, not inferred from Department | See data observations |
| A6 | Dates parsed as `M/D/YYYY`, stored as `date`, compared as `YYYY-MM-DD` strings | No timezone drift |
| A7 | Dropdowns seeded from the sample's distinct values; Vendor allows free entry | New vendors shouldn't require a code change |
| A8 | Records are organisation-wide, visible to every authenticated user | The brief describes organisational analysis, not per-user data |
| A9 | Date range filter is inclusive at both ends | Least surprising |
| A10 | New records continue the ID sequence from 1021 | Preserves the sample's scheme |
| A11 | Group-level Savings % is ratio-of-sums, not the mean of member percentages | Consistent across KPIs, charts and insights |
| A12 | Comparative rate insights require ≥ 2 records per group | See design decisions |
| A13 | Delete is implemented, since the brief asks for CRUD | The "D" is explicit in the wording |

## Observations about the sample data

Three things worth stating, because they shaped the schema:

1. **Status is fully derivable.** The three rows flagged `Over Budget` (1006,
   1011, 1019) are exactly the three where `Actual Spend > Budget`. Since Budget
   and Actual Spend are editable, storing Status as text would let an edit leave
   `Approved` on a row that is now over budget — and the Status filter would
   then quietly lie. It is computed instead.

2. **Business Unit is not derivable from Department.** Seven departments map
   1:1, but **Procurement maps to two different units** — Corporate (1002, office
   supplies) and Technology (1010, 1020, hardware). Business Unit describes who
   the spend is *for*, not who purchased it.

3. **IDs are not date-ordered.** 1001 is 08 Jan; 1002 is 07 Jan. Sorting by ID is
   not a substitute for sorting by date.

Baseline figures for the unfiltered dataset, useful for verification:

```
Records 20 · Budget ₹29,43,000 · Actual ₹26,48,450
Savings ₹2,94,550 · Overall savings 10.01% · Over budget 3
```

## Design decisions

**Savings and Status are computed, never stored.** Both are pure functions of
Budget and Actual Spend. Storing them would create a second thing to keep in sync
on every edit. They are derived in a database view and recomputed in TypeScript
on read, so any drift between the two shows up immediately rather than as a
quietly wrong number.

**The derived view sets `security_invoker = true`.** A PostgreSQL view runs with
the permissions of its *owner* by default, which means a view over an
RLS-protected table bypasses that RLS entirely — the public key would read every
row. `security_invoker` makes the view evaluate RLS as the calling user. RLS on
the table alone is not sufficient protection when the application reads through
a view.

**Money columns are cast to `float8` and coerced with `Number()`.** PostgreSQL
`numeric` is serialised to JSON as a *string* to preserve arbitrary precision, so
`budget` arrives as `"185000.00"`. Summing those concatenates strings instead of
adding numbers — silently, producing nonsense in every KPI. Values here top out
at 320,000.00, well inside float64's exact range.

**Two savings percentages, deliberately.** Overall Savings % is ratio-of-sums
(10.01%); Avg Savings % per Record is the mean of the rows' percentages (9.29%).
They answer different questions — the first weights by budget size, the second
treats every line equally — and showing both makes the distinction explicit.

**Filters compose through a single derivation.** All six filters live in one
state object, and `applyFilters()` is the only place a record is ever excluded.
The KPI grid, all five charts, the insights panel and the table consume its
output, so they cannot disagree. Semantics are AND across filter types, OR
within a type, with an empty selection meaning *unconstrained*.

**Insights impose a minimum group size.** With 20 records across 16 categories
and 19 vendors, most groups hold a single row, and a single row's savings rate is
almost always the extreme value. Comparative rate insights therefore consider
only groups with at least two records, and name any group excluded for size —
Low priority, for instance, has the highest rate in the sample precisely because
it is one record. Single-item extremes are still reported, but always carry their
record count.

**Filtering happens client-side.** The dataset is 20 rows; one fetch, cached, and
every filter change is instant with no round-trip and no loading flicker across
five charts. `applyFilters` is written as a predicate so the same logic could be
pushed into SQL `WHERE` clauses if the data grew — see [limitations](#known-limitations).

## Setup

Requires **Node.js 22 or newer**. `@supabase/supabase-js` depends on a native
`WebSocket`, which Node 20 does not provide; `createClient()` throws there.

```bash
git clone <repository-url>
cd spend-analytics
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Where it is used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Safe to expose **because** RLS and `security_invoker` are configured |
| `SUPABASE_SECRET_KEY` | local scripts only | Bypasses RLS. Never `NEXT_PUBLIC_`, never deployed, never committed |
| `DATABASE_URL` | local migrations only | Not needed at runtime. Use the **Session pooler** string — the direct endpoint is IPv6-only |

## Database setup

Two migrations in `supabase/migrations/`, applied in order:

- `001_schema.sql` — table, ID sequence starting at 1021, indexes, an
  `updated_at` trigger, the derived view, and RLS policies scoped to the
  `authenticated` role.
- `002_seed.sql` — the 20 sample records, ending with a verification query.

Either paste both into the Supabase SQL editor, or run:

```bash
npm run migrate
```

The verification query must return exactly:

```
records | total_budget | total_actual | total_savings | savings_pct | over_budget
     20 |   2943000.00 |   2648450.00 |     294550.00 |       10.01 |           3
```

### Schema

```sql
spend_records (
  id integer primary key,          -- 1001-1020 seeded, sequence continues at 1021
  date date not null,
  department, category, vendor, location, business_unit text not null,
  budget, actual_spend numeric(14,2) not null check (>= 0),
  priority text check (in 'High','Medium','Low'),
  payment_method text check (in 5 known values),
  created_at, updated_at timestamptz
)
```

`spend_records_v` adds `savings`, `savings_pct` and `status` as computed columns.

### Creating the evaluation user

Supabase auth users cannot be seeded with plain SQL. Create one from the
dashboard, or with the service key:

```js
await supabase.auth.admin.createUser({
  email, password, email_confirm: true,   // email_confirm matters — without it sign-in is blocked
});
```

## Deployment

Vercel, with Supabase as the database.

1. Push to GitHub and import the repository into Vercel.
2. Set **only** `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel environment.
   `SUPABASE_SECRET_KEY` and `DATABASE_URL` are local-only and must not be set
   there.
3. Deploy. `engines.node >= 22` pins the build runtime.

> Free-tier Supabase projects pause after roughly a week of inactivity. A daily
> request to the deployed URL keeps the project awake.

## Testing

Two suites, both running against the real database rather than mocks:

```bash
npm run verify   # 49 assertions — calculations and filter composition
npm run e2e      # 38 assertions — HTTP through auth, routes and RLS
```

`verify` checks the pure logic against expected values computed from the sample
data — filter combinations, the zero-budget guard, ratio-of-sums vs
mean-of-ratios, and that date sorting puts record 1002 first.

`e2e` signs in through the Supabase auth API, reconstructs the session cookie in
the format `@supabase/ssr` expects, and drives the real endpoints: unauthenticated
requests return 401, `budget: "abc"` returns 400 naming the field, patching a
budget below actual spend flips Status to Over Budget, deleting twice returns 404.

`TEST_PLAN.md` holds the full manual checklist, including expected totals for
eleven filter combinations.

## Known limitations

Stated plainly rather than left to be discovered:

- **Client-side filtering.** Appropriate at 20 rows and instant, but at tens of
  thousands the fetch would need to move server-side. The filter predicate is
  written to translate directly into SQL `WHERE` clauses when that day comes.
- **Column layout is per-browser.** Resizing, ordering and pinning persist to
  `localStorage`, not to a user profile, so the layout does not follow a user
  between devices.
- **No pagination on the API.** `GET /api/records` returns everything; fine for
  this dataset, not for a large one.
- **No audit trail.** `updated_at` records *when* a row changed, not who changed
  it or what it was before.
- **Single shared dataset.** Per assumption A8 every authenticated user sees and
  edits the same records; there is no per-tenant separation.
