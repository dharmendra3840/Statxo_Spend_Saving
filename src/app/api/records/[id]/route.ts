import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toRecord } from "@/lib/map";
import { fieldErrors, recordPatchSchema } from "@/lib/schema";
import type { DbRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorised" } }, { status: 401 });
  }

  const id = parseId((await ctx.params).id);
  if (id === null) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Body must be JSON" } }, { status: 400 });
  }

  const parsed = recordPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Validation failed", fields: fieldErrors(parsed.error) } },
      { status: 400 },
    );
  }

  // Only the three editable fields are mapped across. Anything else in the body
  // is discarded rather than written — a PATCH cannot be used to rewrite vendor
  // or business unit through a field the UI does not expose.
  const patch: Record<string, unknown> = {};
  if (parsed.data.budget !== undefined) patch.budget = parsed.data.budget;
  if (parsed.data.actualSpend !== undefined) patch.actual_spend = parsed.data.actualSpend;
  if (parsed.data.category !== undefined) patch.category = parsed.data.category;

  const { data, error } = await supabase
    .from("spend_records")
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  // Under RLS a hidden or missing row yields zero affected rows rather than an
  // error, so an empty result is the 404 signal.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: { message: "Record not found" } }, { status: 404 });
  }

  const { data: updated, error: readError } = await supabase
    .from("spend_records_v")
    .select("*")
    .eq("id", id)
    .single();

  if (readError) {
    return NextResponse.json({ error: { message: readError.message } }, { status: 500 });
  }

  return NextResponse.json({ data: toRecord(updated as DbRow) });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorised" } }, { status: 401 });
  }

  const id = parseId((await ctx.params).id);
  if (id === null) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("spend_records")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: { message: "Record not found" } }, { status: 404 });
  }

  return NextResponse.json({ data: { id } });
}
