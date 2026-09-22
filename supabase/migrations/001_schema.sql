-- Spend & Saving Analytics Platform — schema
-- Run this first, in the Supabase SQL editor.

create table if not exists public.spend_records (
  id             integer primary key,
  date           date          not null,
  department     text          not null,
  category       text          not null,
  vendor         text          not null,
  location       text          not null,
  business_unit  text          not null,
  budget         numeric(14,2) not null check (budget >= 0),
  actual_spend   numeric(14,2) not null check (actual_spend >= 0),
  priority       text          not null check (priority in ('High','Medium','Low')),
  payment_method text          not null check (payment_method in
                   ('Monthly','Purchase Order','Project','Annual Contract','Corporate Card')),
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

-- Seed rows use ids 1001-1020; new records continue from 1021 (assumption A10).
create sequence if not exists public.spend_records_id_seq
  start 1021 owned by public.spend_records.id;
alter table public.spend_records
  alter column id set default nextval('public.spend_records_id_seq');

create index if not exists spend_records_date_idx          on public.spend_records (date);
create index if not exists spend_records_business_unit_idx on public.spend_records (business_unit);
create index if not exists spend_records_category_idx      on public.spend_records (category);

-- A column default only fires on INSERT, so without this trigger updated_at would
-- still read as the seed time after every inline edit.
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists spend_records_touch on public.spend_records;
create trigger spend_records_touch
  before update on public.spend_records
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Derived view. Status and savings are computed, never stored (assumption A2),
-- so an edit to budget or actual_spend can never leave them stale.
--
-- security_invoker = true is NOT optional. A Postgres view runs with the
-- permissions of its OWNER by default, which means a view over an RLS-protected
-- table bypasses that RLS entirely -- the anon key would read every row. With
-- security_invoker the view evaluates RLS as the calling user instead.
--
-- ::float8 casts because numeric is serialised to JSON as a STRING to preserve
-- arbitrary precision; without the cast, summing budgets in JS concatenates
-- strings instead of adding numbers. Values here max out at 320,000.00, well
-- inside float64's exact range, so nothing is lost.
-- ---------------------------------------------------------------------------
create or replace view public.spend_records_v
  with (security_invoker = true) as
select
  id,
  date,
  department,
  category,
  vendor,
  location,
  business_unit,
  budget::float8       as budget,
  actual_spend::float8 as actual_spend,
  (budget - actual_spend)::float8 as savings,
  case when budget > 0
       then round((budget - actual_spend) / budget * 100, 2)::float8
  end as savings_pct,
  case when actual_spend > budget then 'Over Budget' else 'Approved' end as status,
  priority,
  payment_method,
  created_at,
  updated_at
from public.spend_records;

-- ---------------------------------------------------------------------------
-- RLS. The dataset is organisation-wide (assumption A8), so any authenticated
-- user may read and write all rows. This is only safe because `to authenticated`
-- excludes the anon role -- without it the public anon key reads the whole table.
-- ---------------------------------------------------------------------------
alter table public.spend_records enable row level security;

drop policy if exists "authenticated read"   on public.spend_records;
drop policy if exists "authenticated insert" on public.spend_records;
drop policy if exists "authenticated update" on public.spend_records;
drop policy if exists "authenticated delete" on public.spend_records;

create policy "authenticated read"   on public.spend_records
  for select to authenticated using (true);
create policy "authenticated insert" on public.spend_records
  for insert to authenticated with check (true);
create policy "authenticated update" on public.spend_records
  for update to authenticated using (true) with check (true);
create policy "authenticated delete" on public.spend_records
  for delete to authenticated using (true);
