// Checks lib/calc, lib/filter and lib/kpi against the expected values in
// TEST_PLAN.md, using the real seeded data pulled from the API layer's view.
// Run with: npx tsx scripts/verify-logic.mts

import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const { toRecord } = await import("../src/lib/map.ts");
const { applyFilters } = await import("../src/lib/filter.ts");
const { computeKpis } = await import("../src/lib/kpi.ts");
const { DEFAULT_FILTERS } = await import("../src/lib/types.ts");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows: raw } = await client.query("select * from public.spend_records_v order by id");
await client.end();

const records = raw.map(toRecord);

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(52)} ${ok ? actual : `got ${actual}, want ${expected}`}`);
};

const f = (over) => ({ ...DEFAULT_FILTERS, ...over });
const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const ids = (rows) => rows.map((r) => r.id).join(",");

console.log("\n--- types (R2: numeric must not be a string) ---");
check("typeof budget", typeof records[0].budget, "number");
check("typeof savingsPct", typeof records[0].savingsPct, "number");

console.log("\n--- baseline (TEST_PLAN 5.1 / 6.x) ---");
const k = computeKpis(records);
check("record count", k.recordCount, 20);
check("total budget", k.totalBudget, 2943000);
check("total actual", k.totalActual, 2648450);
check("total savings", k.totalSavings, 294550);
check("overall savings % (ratio of sums)", k.overallSavingsPct.toFixed(2), "10.01");
check("avg savings % per record (mean of ratios)", k.avgSavingsPctPerRecord.toFixed(2), "9.29");
check("over-budget count", k.overBudgetCount, 3);
check("total overspend", k.totalOverspend, 19500);
check("avg spend per record", Math.round(k.avgSpendPerRecord), 132423);
check("ratio-of-sums differs from mean-of-ratios",
  k.overallSavingsPct.toFixed(2) !== k.avgSavingsPctPerRecord.toFixed(2), "true");

console.log("\n--- filter composition (TEST_PLAN 5.2-5.11) ---");
const t = [
  ["5.2  BU=Technology", f({ businessUnits: ["Technology"] }), "1001,1007,1010,1012,1016,1020", 1293000, 1134700],
  ["5.3  BU=Tech + Loc=Bengaluru", f({ businessUnits: ["Technology"], locations: ["Bengaluru"] }), "1001,1016,1020", 655000, 565800],
  ["5.4  + Status=Approved", f({ businessUnits: ["Technology"], locations: ["Bengaluru"], statuses: ["Approved"] }), "1001,1016,1020", 655000, 565800],
  ["5.5  Status=Over Budget", f({ statuses: ["Over Budget"] }), "1006,1011,1019", 268000, 287500],
  ["5.6  Feb 2026", f({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }), "1007,1008,1009,1010", 703000, 618300],
  ["5.7  Cat in {Hardware, Cloud Infra}", f({ categories: ["Hardware", "Cloud Infrastructure"] }), "1001,1010,1012,1020", 1020000, 893400],
  ["5.8  Vendor=Corporate Travel Co.", f({ vendors: ["Corporate Travel Co."] }), "1006,1017", 205000, 199700],
  ["5.9  Location=Hyderabad", f({ locations: ["Hyderabad"] }), "1006,1011,1018", 320000, 322700],
  ["5.10 Mar + Chennai", f({ dateFrom: "2026-03-01", dateTo: "2026-03-31", locations: ["Chennai"] }), "1014", 72000, 58300],
  ["5.11 Tech + Over Budget (empty)", f({ businessUnits: ["Technology"], statuses: ["Over Budget"] }), "", 0, 0],
];
for (const [label, filters, expectIds, expectBudget, expectActual] of t) {
  const r = applyFilters(records, filters);
  check(`${label} ids`, ids(r), expectIds);
  check(`${label} budget`, sum(r, "budget"), expectBudget);
  check(`${label} actual`, sum(r, "actualSpend"), expectActual);
}

console.log("\n--- edge cases ---");
const empty = applyFilters(records, f({ businessUnits: ["Technology"], statuses: ["Over Budget"] }));
const ek = computeKpis(empty);
check("empty set: savings % is null not NaN", ek.overallSavingsPct, "null");
check("empty set: avg spend is null not NaN", ek.avgSpendPerRecord, "null");
check("empty set: counts are 0", ek.recordCount, 0);
check("inclusive single-day range", ids(applyFilters(records, f({ dateFrom: "2026-01-08", dateTo: "2026-01-08" }))), "1001");
check("from > to yields empty", applyFilters(records, f({ dateFrom: "2026-05-01", dateTo: "2026-01-01" })).length, 0);
check("negative savings preserved (Hyderabad)", sum(applyFilters(records, f({ locations: ["Hyderabad"] })), "savings"), -2700);
check("date sort puts 1002 first, not 1001",
  [...records].sort((a, b) => a.date.localeCompare(b.date))[0].id, 1002);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
