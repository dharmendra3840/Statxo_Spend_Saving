// End-to-end checks against the running dev server, exercising the real
// middleware, route handlers, RLS and database.
//
// Signs in through the Supabase auth API and reconstructs the session cookie in
// the format @supabase/ssr expects, so requests hit the app exactly as a browser
// would. Run with: npx tsx scripts/e2e.mts
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const REF = new URL(SUPABASE_URL).hostname.split(".")[0];

let pass = 0;
let fail = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = String(actual) === String(expected);
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(54)} ${ok ? actual : `got ${actual}, want ${expected}`}`,
  );
};

// --- sign in ---------------------------------------------------------------
const signIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "evaluator@statxo.demo", password: "StatxoDemo#2026" }),
});
const session = await signIn.json();
if (!session.access_token) {
  console.error("sign-in failed:", session);
  process.exit(1);
}

// @supabase/ssr stores the session base64-encoded, chunked across cookies.
const encoded = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
const CHUNK = 3180;
const cookies: string[] = [];
if (encoded.length <= CHUNK) {
  cookies.push(`sb-${REF}-auth-token=${encoded}`);
} else {
  for (let i = 0, n = 0; i < encoded.length; i += CHUNK, n++) {
    cookies.push(`sb-${REF}-auth-token.${n}=${encoded.slice(i, i + CHUNK)}`);
  }
}
const Cookie = cookies.join("; ");

const authed = (url: string, init: RequestInit = {}) =>
  fetch(`${BASE}${url}`, {
    ...init,
    redirect: "manual",
    headers: { Cookie, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

// --- unauthenticated gates -------------------------------------------------
console.log("\n--- Phase 1: auth gates (unauthenticated) ---");
for (const [path, want] of [["/dashboard", 307], ["/records", 307]] as const) {
  const r = await fetch(`${BASE}${path}`, { redirect: "manual" });
  check(`1.x  ${path} redirects`, r.status, want);
  check(`      -> location`, new URL(r.headers.get("location")!, BASE).pathname, "/login");
}
check("1.12 GET /api/records unauthenticated", (await fetch(`${BASE}/api/records`)).status, 401);
check(
  "1.12 POST /api/records unauthenticated",
  (await fetch(`${BASE}/api/records`, { method: "POST", body: "{}" })).status,
  401,
);
check(
  "1.12 DELETE /api/records/1001 unauthenticated",
  (await fetch(`${BASE}/api/records/1001`, { method: "DELETE" })).status,
  401,
);

// --- authenticated read ----------------------------------------------------
console.log("\n--- Phase 2: authenticated API ---");
const listRes = await authed("/api/records");
check("2.1  GET /api/records authenticated", listRes.status, 200);
const list = (await listRes.json()).data as Record<string, unknown>[];
check("2.1  record count", list.length, 20);
check("2.2  typeof budget", typeof list[0].budget, "number");
check("2.2  typeof savingsPct", typeof list[0].savingsPct, "number");
check("2.2  camelCase key present", "businessUnit" in list[0], "true");
check("2.2  snake_case key absent", "business_unit" in list[0], "false");
check("2.2  derived status on 1006", list.find((r) => r.id === 1006)?.status, "Over Budget");
check(
  "2.2  totals match seed",
  list.reduce((s, r) => s + (r.budget as number), 0),
  2943000,
);

check("1.x  /dashboard authenticated renders", (await authed("/dashboard")).status, 200);
check("1.11 /login while authenticated redirects", (await authed("/login")).status, 307);

// --- validation ------------------------------------------------------------
console.log("\n--- Phase 2: server-side validation ---");
const valid = {
  date: "2026-05-04",
  department: "IT",
  category: "Hardware",
  vendor: "E2E Test Vendor",
  location: "Pune",
  businessUnit: "Technology",
  budget: 100000,
  actualSpend: 75000,
  priority: "High",
  paymentMethod: "Project",
};
const post = (body: unknown) => authed("/api/records", { method: "POST", body: JSON.stringify(body) });

check("2.3  budget as a string -> 400", (await post({ ...valid, budget: "abc" })).status, 400);
check("2.4  missing vendor -> 400", (await post({ ...valid, vendor: "" })).status, 400);
check("2.5  negative budget -> 400", (await post({ ...valid, budget: -5 })).status, 400);
check("2.x  bad priority enum -> 400", (await post({ ...valid, priority: "Urgent" })).status, 400);
check("2.x  bad date format -> 400", (await post({ ...valid, date: "04/05/2026" })).status, 400);

const badBody = await post({ ...valid, budget: "abc" });
check("2.3  400 names the offending field", Object.keys((await badBody.json()).error.fields)[0], "budget");

// --- create / update / delete ----------------------------------------------
console.log("\n--- Phase 4: create, edit, delete ---");
const created = await post(valid);
check("4.8  POST valid -> 201", created.status, 201);
const rec = (await created.json()).data;
check("4.9  new id continues sequence", rec.id >= 1021, "true");
check("6.x  savings computed", rec.savings, 25000);
check("6.x  savingsPct computed", rec.savingsPct, 25);
check("4.x  status derived", rec.status, "Approved");

const patched = await authed(`/api/records/${rec.id}`, {
  method: "PATCH",
  body: JSON.stringify({ budget: 50000 }),
});
check("4.13 PATCH budget below spend -> 200", patched.status, 200);
const p = (await patched.json()).data;
check("4.13 status flips to Over Budget", p.status, "Over Budget");
check("4.13 savings now negative", p.savings, -25000);

check(
  "2.6  PATCH unknown id -> 404",
  (await authed("/api/records/999999", { method: "PATCH", body: JSON.stringify({ budget: 1 }) })).status,
  404,
);
check(
  "2.7  PATCH non-editable field rejected",
  (await authed(`/api/records/${rec.id}`, { method: "PATCH", body: JSON.stringify({ vendor: "x" }) })).status,
  400,
);
check(
  "2.x  PATCH invalid value -> 400",
  (await authed(`/api/records/${rec.id}`, { method: "PATCH", body: JSON.stringify({ budget: -1 }) })).status,
  400,
);

// Zero budget: the savingsPct guard must yield null, not NaN or Infinity.
const zeroed = await authed(`/api/records/${rec.id}`, {
  method: "PATCH",
  body: JSON.stringify({ budget: 0 }),
});
check("4.5  budget 0 -> savingsPct is null", (await zeroed.json()).data.savingsPct, "null");

check("2.8  DELETE -> 200", (await authed(`/api/records/${rec.id}`, { method: "DELETE" })).status, 200);
check("2.9  DELETE again -> 404", (await authed(`/api/records/${rec.id}`, { method: "DELETE" })).status, 404);

const after = ((await (await authed("/api/records")).json()).data as unknown[]).length;
check("4.x  dataset restored to 20 records", after, 20);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
