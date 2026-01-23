import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing history id.");

  try {
    const rows = await db.ingestionRow.findMany({
      where: { uploadId: id },
      orderBy: [{ visitDate: "asc" }, { location: "asc" }],
    });
    return NextResponse.json({ ok: true, rows });
  } catch {
    return jsonError("Failed to load upload rows.", 500);
  }
}
