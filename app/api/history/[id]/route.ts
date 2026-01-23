import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing history id.");

  try {
    await db.uploadHistory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete history record.", 500);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing history id.");

  let body: { note?: string | null; fileName?: string } | null = null;
  try {
    body = (await req.json()) as { note?: string | null; fileName?: string };
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const data: { note?: string | null; fileName?: string } = {};
  if (typeof body?.note === "string" || body?.note === null) data.note = body.note;
  if (typeof body?.fileName === "string") data.fileName = body.fileName.trim();

  if (!Object.keys(data).length) return jsonError("Nothing to update.");

  try {
    const updated = await db.uploadHistory.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, item: updated });
  } catch {
    return jsonError("Failed to update history record.", 500);
  }
}
