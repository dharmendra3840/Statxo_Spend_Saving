-- Sample data from Assignment_Data_Spend&Saving.xlsx, transcribed verbatim.
-- Dates converted from M/D/YYYY to ISO. Status is NOT seeded: it is derived in
-- spend_records_v, and the derivation reproduces all 20 source values exactly
-- (rows 1006, 1011 and 1019 are the three where actual_spend > budget).

insert into public.spend_records
  (id, date, department, category, vendor, location, business_unit,
   budget, actual_spend, priority, payment_method)
values
  (1001,'2026-01-08','IT',         'Cloud Infrastructure','Microsoft Azure',     'Bengaluru','Technology',185000,162400,'High',  'Monthly'),
  (1002,'2026-01-07','Procurement','Office Supplies',     'Staples',             'Mumbai',   'Corporate', 42000, 36750,'Medium','Purchase Order'),
  (1003,'2026-01-11','Marketing',  'Digital Advertising', 'Google Ads',          'Delhi NCR','Marketing', 125000,113800,'High',  'Monthly'),
  (1004,'2026-01-16','Finance',    'Consulting',          'Deloitte',            'Mumbai',   'Finance',   210000,198500,'High',  'Project'),
  (1005,'2026-01-22','HR',         'Recruitment',         'LinkedIn',            'Bengaluru','People',     68000, 54200,'Medium','Annual Contract'),
  (1006,'2026-01-28','Operations', 'Travel',              'Corporate Travel Co.','Hyderabad','Operations', 95000,102300,'Medium','Corporate Card'),
  (1007,'2026-02-03','IT',         'Software Licenses',   'Adobe',               'Chennai',  'Technology', 78000, 69400,'Medium','Annual Contract'),
  (1008,'2026-02-09','Facilities', 'Maintenance',         'CBRE',                'Pune',     'Corporate', 145000,121600,'High',  'Purchase Order'),
  (1009,'2026-02-14','Sales',      'Events',              'EventWorks',          'Mumbai',   'Sales',     160000,139500,'High',  'Project'),
  (1010,'2026-02-21','Procurement','Hardware',            'Dell Technologies',   'Chennai',  'Technology',320000,287800,'High',  'Purchase Order'),
  (1011,'2026-03-02','Marketing',  'Content Services',    'ContentHub',          'Hyderabad','Marketing',  85000, 91800,'Medium','Project'),
  (1012,'2026-03-08','IT',         'Cloud Infrastructure','Amazon Web Services', 'Pune',     'Technology',240000,211700,'High',  'Monthly'),
  (1013,'2026-03-15','Finance',    'Software',            'Oracle',              'Delhi NCR','Finance',   175000,151200,'High',  'Annual Contract'),
  (1014,'2026-03-19','HR',         'Employee Training',   'SkillPro',            'Chennai',  'People',     72000, 58300,'Low',   'Project'),
  (1015,'2026-03-26','Operations', 'Logistics',           'BlueDart',            'Mumbai',   'Operations',135000,126400,'Medium','Purchase Order'),
  (1016,'2026-04-03','IT',         'Cybersecurity',       'CrowdStrike',         'Bengaluru','Technology',195000,171900,'High',  'Annual Contract'),
  (1017,'2026-04-10','Sales',      'Travel',              'Corporate Travel Co.','Pune',     'Sales',     110000, 97400,'Medium','Corporate Card'),
  (1018,'2026-04-17','Marketing',  'Digital Advertising', 'Meta Ads',            'Hyderabad','Marketing', 140000,128600,'High',  'Monthly'),
  (1019,'2026-04-23','Facilities', 'Utilities',           'Tata Power',          'Delhi NCR','Corporate',  88000, 93400,'Medium','Monthly'),
  (1020,'2026-04-29','Procurement','Hardware',            'HP Enterprise',       'Bengaluru','Technology',275000,231500,'High',  'Purchase Order')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Verification. Expected results:
--   records = 20, budget = 2943000.00, actual = 2648450.00,
--   savings = 294550.00, savings_pct = 10.01, over_budget = 3
-- These are the unfiltered baseline figures the dashboard KPI row must match.
-- ---------------------------------------------------------------------------
select
  count(*)                                                     as records,
  sum(budget)                                                  as total_budget,
  sum(actual_spend)                                            as total_actual,
  sum(budget) - sum(actual_spend)                              as total_savings,
  round((sum(budget) - sum(actual_spend)) / sum(budget) * 100, 2) as savings_pct,
  count(*) filter (where actual_spend > budget)                as over_budget
from public.spend_records;
