import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const items = await db.uploadHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, items });
  } catch {
    return jsonError("Failed to load upload history.", 500);
  }
}
