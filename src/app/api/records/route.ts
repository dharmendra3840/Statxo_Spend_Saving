import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toRecord, toRow } from "@/lib/map";
import { fieldErrors, recordInputSchema } from "@/lib/schema";
import type { DbRow } from "@/lib/types";

// Explicitly Node, not Edge: this is the "backend" the brief asks for, running
// the same request/response model as an Express route.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every handler checks the session itself. Middleware guards pages; it does not
 * guard data, because a direct request to /api/records never passes through a
 * page route.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorised" } }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("spend_records_v")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: (data as DbRow[]).map(toRecord) });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorised" } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Body must be JSON" } }, { status: 400 });
  }

  const parsed = recordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Validation failed", fields: fieldErrors(parsed.error) } },
      { status: 400 },
    );
  }

  // id is omitted deliberately: the sequence assigns it, continuing from 1021.
  const { data, error } = await supabase
    .from("spend_records")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  // Read back through the view so the response carries the derived columns.
  const { data: created, error: readError } = await supabase
    .from("spend_records_v")
    .select("*")
    .eq("id", data.id)
    .single();

  if (readError) {
    return NextResponse.json({ error: { message: readError.message } }, { status: 500 });
  }

  return NextResponse.json({ data: toRecord(created as DbRow) }, { status: 201 });
}
