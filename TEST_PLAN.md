# Test Plan — Spend & Saving Analytics Platform

Manual test cases, ordered to match the build sequence. Every expected value is
derived from the 20 seed records, so each case has a known-correct answer rather
than "looks about right".

Legend: ☐ not tested · ✅ passing · ❌ failing

---

## Phase 0 — Infrastructure (done)

| # | Test | Expected | Status |
|---|---|---|---|
| 0.1 | `npm run migrate` | both files apply, no error | ✅ |
| 0.2 | Seed verification row | `20 \| 2943000.00 \| 2648450.00 \| 294550.00 \| 10.01 \| 3` | ✅ |
| 0.3 | View has `security_invoker=true` | confirmed in `pg_class.reloptions` | ✅ |
| 0.4 | RLS enabled, 4 policies scoped to `authenticated` | SELECT/INSERT/UPDATE/DELETE | ✅ |
| 0.5 | `updated_at` trigger exists | `spend_records_touch` | ✅ |
| 0.6 | Anon REST read on **table** | `[]` | ✅ |
| 0.7 | Anon REST read on **view** | `[]` | ✅ |
| 0.8 | Authenticated read | 20 rows | ✅ |
| 0.9 | `typeof budget` in API response | `number`, not `string` | ✅ |
| 0.10 | `npm run build` | green | ✅ |
| 0.11 | `npm run dev` serves 200 | ✅ | ✅ |

---

## Phase 1 — Authentication (gate)

| # | Test | Expected | Status |
|---|---|---|---|
| 1.1 | Visit `/dashboard` logged out | 302 → `/login` | ☐ |
| 1.2 | Visit `/records` logged out | 302 → `/login` | ☐ |
| 1.3 | Login with `evaluator@statxo.demo` / `StatxoDemo#2026` | lands on `/dashboard` | ☐ |
| 1.4 | Login with wrong password | inline "Invalid email or password"; **not** "no such user" | ☐ |
| 1.5 | Login with empty fields | client validation blocks submit, no request fired | ☐ |
| 1.6 | Submit button during request | disabled + spinner, cannot double-submit | ☐ |
| 1.7 | Refresh page while logged in | **still logged in** — the classic `@supabase/ssr` cookie bug | ☐ |
| 1.8 | Open `/dashboard` in a new tab while logged in | still logged in | ☐ |
| 1.9 | Logout | redirected to `/login`, session cleared | ☐ |
| 1.10 | Press browser Back after logout | does **not** show cached dashboard | ☐ |
| 1.11 | Visit `/login` while already logged in | redirect to `/dashboard` | ☐ |
| 1.12 | `curl` any `/api/records` route with no cookie | **401**, not 200 or 500 | ☐ |

> 1.7 and 1.12 are the two that actually matter. 1.7 catches middleware that
> doesn't refresh the session cookie; 1.12 catches auth enforced only in
> middleware, where the API is still wide open to a direct request.

---

## Phase 2 — API contract

| # | Test | Expected | Status |
|---|---|---|---|
| 2.1 | `GET /api/records` authenticated | 20 records, camelCase keys | ☐ |
| 2.2 | Response field types | `budget`/`actualSpend`/`savings` are `number`; `savingsPct` `number\|null` | ☐ |
| 2.3 | `POST` with `budget: "abc"` | **400** with field error — not 500, not a saved row | ☐ |
| 2.4 | `POST` with missing required field | 400 naming the field | ☐ |
| 2.5 | `POST` with `budget: -5` | 400 (check constraint + zod) | ☐ |
| 2.6 | `PATCH` a non-existent id (e.g. 9999) | **404**, not 200 with empty body | ☐ |
| 2.7 | `PATCH` with an unexpected field (e.g. `vendor`) | ignored or 400 — never silently written | ☐ |
| 2.8 | `DELETE` an existing record | 200, row gone from subsequent GET | ☐ |
| 2.9 | `DELETE` same id twice | second returns 404 | ☐ |
| 2.10 | `updated_at` changes after PATCH | differs from `created_at` | ☐ |

---

## Phase 3 — Data table

| # | Test | Expected | Status |
|---|---|---|---|
| 3.1 | Table renders all 20 records | 20 rows across pages | ☐ |
| 3.2 | Savings column, record 1001 | ₹22,600 | ☐ |
| 3.3 | Savings % column, record 1001 | 12.22% | ☐ |
| 3.4 | Status column, record 1006 | Over Budget | ☐ |
| 3.5 | Negative savings styling, record 1019 | −₹5,400 shown in red with sign | ☐ |
| 3.6 | Search "Dell" | 1 row (1010) | ☐ |
| 3.7 | Search "bengaluru" (lowercase) | 4 rows — 1001, 1005, 1016, 1020 | ☐ |
| 3.8 | Search gibberish "zzzz" | empty state, not a blank table | ☐ |
| 3.9 | Sort Budget ascending | first row 1002 (₹42,000) | ☐ |
| 3.10 | Sort Budget descending | first row 1010 (₹320,000) | ☐ |
| 3.11 | Sort Savings % descending | first row 1005 (20.29%) | ☐ |
| 3.12 | Sort Date ascending | first row **1002**, not 1001 — IDs aren't date-ordered | ☐ |
| 3.13 | Pagination at 10/page | 2 pages, "Showing 1–10 of 20" | ☐ |
| 3.14 | Change page size to 25 | single page, all 20 rows | ☐ |
| 3.15 | Column resize | width changes and persists across reload | ☐ |
| 3.16 | Column reorder by dragging header | order changes and persists | ☐ |
| 3.17 | Pin ID column, scroll horizontally | ID stays visible | ☐ |
| 3.18 | Pin a column **after** resizing another | pinned column stays aligned, doesn't detach | ☐ |
| 3.19 | Hide a column via toggle | disappears; ID not hideable | ☐ |
| 3.20 | Sort Savings % with a zero-budget row present | blanks (`—`) sink to bottom in **both** directions | ☐ |

---

## Phase 4 — Add / edit / delete

| # | Test | Expected | Status |
|---|---|---|---|
| 4.1 | Open Add Record modal | all 10 fields present with correct control types | ☐ |
| 4.2 | Submit empty form | every required field flags, nothing sent | ☐ |
| 4.3 | Type budget 100000, actual 75000 | live preview: Savings ₹25,000, 25.00%, Approved | ☐ |
| 4.4 | Type budget 100000, actual 120000 | live preview: −₹20,000, −20.00%, **Over Budget** | ☐ |
| 4.5 | Type budget 0 | Savings % shows `—`, never `NaN` or `Infinity` | ☐ |
| 4.6 | Clear the budget field entirely | `—`, no crash | ☐ |
| 4.7 | Enter letters in a numeric field | rejected with a message | ☐ |
| 4.8 | Submit a valid record | success toast, modal closes, row appears | ☐ |
| 4.9 | New record's ID | **1021** (sequence continues) | ☐ |
| 4.10 | Total Records KPI after adding | 21 | ☐ |
| 4.11 | Total Budget KPI after adding ₹100,000 | 3,043,000 | ☐ |
| 4.12 | Reload the page | new record still there (persisted, not local state) | ☐ |
| 4.13 | Inline-edit record 1001 budget → 150000 | Savings −₹12,400, Status flips to **Over Budget** | ☐ |
| 4.14 | …and the KPI row updates in the same interaction | over-budget count 3 → 4 | ☐ |
| 4.15 | …and it survives a reload | ☐ |
| 4.16 | Inline-edit Category on any row | saves, chart 3 (donut) redistributes | ☐ |
| 4.17 | Inline-edit to an invalid value (negative) | red border, no request sent | ☐ |
| 4.18 | Press Escape mid-edit | reverts, no request sent | ☐ |
| 4.19 | Delete a record with confirm | row gone, KPIs drop, survives reload | ☐ |
| 4.20 | Cancel the delete confirm | nothing happens | ☐ |

> Reset record 1001 to budget 185000 after 4.13–4.15, or every later expected
> value in this document shifts.

---

## Phase 5 — Filters (the highest-risk area)

Apply each, then check **KPIs, all 5 charts, insights and the table** agree.

| # | Filter | Expected records | Budget | Actual | Savings | Savings % | Status |
|---|---|---|---|---|---|---|---|
| 5.1 | None (baseline) | 20 | 29,43,000 | 26,48,450 | 2,94,550 | 10.01% | ☐ |
| 5.2 | BU = Technology | 6 → 1001,1007,1010,1012,1016,1020 | 12,93,000 | 11,34,700 | 1,58,300 | 12.24% | ☐ |
| 5.3 | BU = Technology **+** Location = Bengaluru | 3 → 1001,1016,1020 | 6,55,000 | 5,65,800 | 89,200 | 13.62% | ☐ |
| 5.4 | …**+** Status = Approved | 3 → same | 6,55,000 | 5,65,800 | 89,200 | 13.62% | ☐ |
| 5.5 | Status = Over Budget | 3 → 1006,1011,1019 | 2,68,000 | 2,87,500 | **−19,500** | **−7.28%** | ☐ |
| 5.6 | Date 2026-02-01 → 2026-02-28 | 4 → 1007,1008,1009,1010 | 7,03,000 | 6,18,300 | 84,700 | 12.05% | ☐ |
| 5.7 | Category ∈ {Hardware, Cloud Infrastructure} | 4 → 1001,1010,1012,1020 | 10,20,000 | 8,93,400 | 1,26,600 | 12.41% | ☐ |
| 5.8 | Vendor = Corporate Travel Co. | 2 → 1006,1017 | 2,05,000 | 1,99,700 | 5,300 | 2.59% | ☐ |
| 5.9 | Location = Hyderabad | 3 → 1006,1011,1018 | 3,20,000 | 3,22,700 | **−2,700** | **−0.84%** | ☐ |
| 5.10 | Date 2026-03-01 → 2026-03-31 **+** Location = Chennai | 1 → 1014 | 72,000 | 58,300 | 13,700 | 19.03% | ☐ |
| 5.11 | BU = Technology **+** Status = Over Budget | **0 — empty set** | — | — | — | — | ☐ |

Additional filter behaviour:

| # | Test | Expected | Status |
|---|---|---|---|
| 5.12 | Empty result (5.11) | every KPI `—`/0, charts show empty state, table empty state, **no crash, no NaN** | ☐ |
| 5.13 | Reset Filters after 5.3 | returns exactly to 5.1 baseline | ☐ |
| 5.14 | Reset button when no filters applied | disabled | ☐ |
| 5.15 | Date range where from > to | empty set handled gracefully | ☐ |
| 5.16 | Single-day range 2026-01-08 → 2026-01-08 | 1 record (1001) — boundaries inclusive | ☐ |
| 5.17 | Apply filter, navigate Dashboard ↔ Records | filter persists across pages | ☐ |
| 5.18 | Apply filter, copy URL, open in new tab | same filtered view (URL state) | ☐ |
| 5.19 | Apply filter, then reload | filter survives | ☐ |
| 5.20 | Filter to page 2, then narrow the filter | pagination resets to page 1, not a blank page | ☐ |
| 5.21 | Filter applied, then add a record matching it | appears immediately | ☐ |
| 5.22 | Filter applied, then add a record **not** matching it | does not appear, but Total Records in an unfiltered context is right | ☐ |

> 5.3 and 5.4 are the composition test. If 5.3 returns 6 records (only the last
> filter applied) or 9 (union instead of intersection), the filter model is
> wrong — see PRD §8.

---

## Phase 6 — KPI cards

Against the unfiltered baseline:

| # | KPI | Expected | Status |
|---|---|---|---|
| 6.1 | Total Budget | ₹29,43,000 | ☐ |
| 6.2 | Total Actual Spend | ₹26,48,450 | ☐ |
| 6.3 | Total Savings | ₹2,94,550 | ☐ |
| 6.4 | Overall Savings % | 10.01% | ☐ |
| 6.5 | Avg Savings % per Record | 9.29% — **must differ from 6.4** | ☐ |
| 6.6 | Total Records | 20 | ☐ |
| 6.7 | Over-Budget Records | 3 (15%), ₹19,500 over | ☐ |
| 6.8 | Avg Spend per Record | ₹1,32,423 | ☐ |
| 6.9 | Currency formatting | Indian lakh grouping (₹29,43,000 not ₹2,943,000) | ☐ |

> If 6.4 and 6.5 show the same number, one of them is computed wrong.

---

## Phase 7 — Charts

| # | Test | Expected | Status |
|---|---|---|---|
| 7.1 | Line chart buckets | 4 months, Jan–Apr 2026 | ☐ |
| 7.2 | Line chart, April | budget 8,08,000 / actual 7,22,800 (largest month) | ☐ |
| 7.3 | Bar chart top bar | Technology, ₹1,58,300 | ☐ |
| 7.4 | Donut largest slice | Hardware, ₹5,19,300 (19.6%) | ☐ |
| 7.5 | Donut slice count | top 6 + "Other" (16 categories total) | ☐ |
| 7.6 | Stacked bar tallest | IT — 6,15,400 spend + 82,600 unspent | ☐ |
| 7.7 | Area chart final value | ₹2,94,550 cumulative | ☐ |
| 7.8 | Area chart running totals | 57,050 → 1,41,750 → 2,09,350 → 2,94,550 | ☐ |
| 7.9 | **Stacked bar with Status = Over Budget applied** | renders correctly — overspend visible, bars not inverted | ☐ |
| 7.10 | Bar chart grouped by Location | Hyderabad renders as negative (−₹2,700), not clipped to 0 | ☐ |
| 7.11 | Filter to March only | line/area show **1** bucket, not 4 with 3 zeros | ☐ |
| 7.12 | All charts on empty filter result | empty state each, no crash | ☐ |
| 7.13 | Same BU has same colour across charts | consistent palette | ☐ |
| 7.14 | Tooltips | INR formatted | ☐ |

---

## Phase 8 — Insights

| # | Test | Expected | Status |
|---|---|---|---|
| 8.1 | Count rendered | ≥ 6 (target 8) | ☐ |
| 8.2 | Overall savings insight | ₹2.95L, 10.0%, 20 records | ☐ |
| 8.3 | Best-saving BU | People, 19.6%, states "2 records" | ☐ |
| 8.4 | Overspend insight | 3 records (15%), ₹19,500 | ☐ |
| 8.5 | Largest spend line | Dell Technologies, ₹2.88L, 10.9% | ☐ |
| 8.6 | Location spread | Bengaluru 14.2% vs Hyderabad −0.8% | ☐ |
| 8.7 | Priority insight | High 11.6% vs Medium 4.2%, **Low excluded (1 record)** | ☐ |
| 8.8 | Apply BU = Technology | every insight's numbers change | ☐ |
| 8.9 | Filter to 1 record (5.10) | comparative insights suppress rather than print "undefined" | ☐ |
| 8.10 | Filter to 0 records | "No insights for the current selection" | ☐ |

> 8.7 is the integrity check: Low priority has the highest rate (19.0%) on one
> record. If it's quoted as "best priority", the minimum-group-size rule is missing.

---

## Phase 9 — UX states and responsive

| # | Test | Expected | Status |
|---|---|---|---|
| 9.1 | Initial load | skeletons, no layout shift | ☐ |
| 9.2 | Kill network, reload | inline error card, not a blank page | ☐ |
| 9.3 | Kill network, submit a record | error toast, optimistic row rolled back | ☐ |
| 9.4 | 375px viewport | KPIs 1 column, charts stacked, no horizontal page scroll | ☐ |
| 9.5 | 768px viewport | 2-column KPI grid | ☐ |
| 9.6 | Table at 375px | scrolls horizontally, pinned ID visible | ☐ |
| 9.7 | Keyboard only | can log in, filter, sort, open modal, submit | ☐ |
| 9.8 | Focus rings | visible on all interactive elements | ☐ |

---

## Phase 10 — Deployment (gate)

| # | Test | Expected | Status |
|---|---|---|---|
| 10.1 | Live URL loads in a private window | ✅ | ☐ |
| 10.2 | Test credentials work on live URL | ✅ | ☐ |
| 10.3 | `/dashboard` logged out on live URL | redirects | ☐ |
| 10.4 | All 20 records present in production | ✅ | ☐ |
| 10.5 | Add a record in production | persists | ☐ |
| 10.6 | `SUPABASE_SECRET_KEY` **not** in Vercel env | absent | ☐ |
| 10.7 | `DATABASE_URL` **not** in Vercel env | absent | ☐ |
| 10.8 | Repo contains no `.env.local` | `git ls-files \| grep env` → only `.env.local.example` | ☐ |
| 10.9 | Keep-alive ping configured | Supabase project won't pause | ☐ |
| 10.10 | README complete with credentials | ✅ | ☐ |

---

## Regression traps

Re-check these after any change; each has already bitten once or is designed to:

1. `savingsPct` is `null` when budget is 0 — never `NaN`, `0` or `Infinity`
2. Numeric fields arrive as `number`, not `string` (Postgres `numeric` → JSON string)
3. Filters intersect (AND), they don't replace or union
4. Empty array in a filter means "unconstrained", not "match nothing"
5. Status derives from the current budget/actual, never a stale stored value
6. Sorting by date uses the date, not the ID
7. Group rates use ratio-of-sums, not the mean of member percentages
8. Negative savings render below zero rather than being clipped
9. Page resets to 1 when the filter narrows
10. `.env.local` never committed; secret key never reaches the client bundle
