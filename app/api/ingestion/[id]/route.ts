import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

type UpdateBody = {
  location?: string;
  visitDate?: string;
  composters?: number;
  wetWasteKg?: number;
  brownWasteKg?: number;
  leachateL?: number;
  harvestKg?: number;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing row id.");

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const data: UpdateBody = {};
  if (typeof body.location === "string") {
    const loc = body.location.trim();
    if (!loc) return jsonError("Location cannot be empty.");
    data.location = loc;
  }
  if (typeof body.visitDate === "string") {
    const d = new Date(body.visitDate);
    if (Number.isNaN(d.valueOf())) return jsonError("Invalid visitDate.");
    data.visitDate = d.toISOString();
  }

  const composters = toNumber(body.composters);
  if (composters !== undefined) data.composters = composters;
  const wetWasteKg = toNumber(body.wetWasteKg);
  if (wetWasteKg !== undefined) data.wetWasteKg = wetWasteKg;
  const brownWasteKg = toNumber(body.brownWasteKg);
  if (brownWasteKg !== undefined) data.brownWasteKg = brownWasteKg;
  const leachateL = toNumber(body.leachateL);
  if (leachateL !== undefined) data.leachateL = leachateL;
  const harvestKg = toNumber(body.harvestKg);
  if (harvestKg !== undefined) data.harvestKg = harvestKg;

  if (!Object.keys(data).length) return jsonError("Nothing to update.");

  try {
    const updated = await db.ingestionRow.update({
      where: { id },
      data: {
        ...data,
        ...(data.visitDate ? { visitDate: new Date(data.visitDate) } : {}),
      },
    });
    return NextResponse.json({ ok: true, row: updated });
  } catch {
    return jsonError("Failed to update row.", 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing row id.");

  try {
    await db.ingestionRow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete row.", 500);
  }
}
