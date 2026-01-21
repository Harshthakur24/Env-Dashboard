import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseIngestionWorkbook } from "@/lib/ingestion/parse";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function databaseErrorMessage() {
  if (!process.env.DATABASE_URL) {
    return "DATABASE_URL is not set. Create a .env.local file (see docs/setup.md) and restart the server.";
  }

  // Helpful hint for the common SCRAM error: password missing from DATABASE_URL
  // (or password contains special characters and wasn't URL-encoded).
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (!u.password) {
      return "Database error: DATABASE_URL has no password. Use postgresql://user:password@host:port/db (or set PGPASSWORD/POSTGRES_PASSWORD) and restart the server.";
    }
  } catch {
    // ignore
  }

  return "Database error. Check server logs and your DATABASE_URL (if your password has special characters, URL-encode it).";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location")?.trim() || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const where: Prisma.IngestionRowWhereInput = {
    ...(location ? { location } : {}),
    ...(from || to
      ? {
          visitDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  try {
    const rows = await db.ingestionRow.findMany({
      where,
      orderBy: { visitDate: "asc" },
    });

    return NextResponse.json({ ok: true, rows });
  } catch {
    return jsonError(databaseErrorMessage(), 500);
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return jsonError("Missing file field named 'file'.");

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) return jsonError("File too large (max 10MB).");

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return jsonError("Only Excel files (.xlsx/.xls) are supported.");
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseIngestionWorkbook(buffer);

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { ok: false, message: "No valid rows found to ingest.", errors: parsed.errors, headerMap: parsed.headerMap },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;

  try {
    await db.$transaction(async (tx) => {
      for (const r of parsed.rows) {
        const existing = await tx.ingestionRow.findUnique({
          where: { location_visitDate: { location: r.location, visitDate: r.visitDate } },
          select: { id: true },
        });

        if (existing) {
          updated += 1;
          await tx.ingestionRow.update({
            where: { id: existing.id },
            data: {
              composters: r.composters,
              wetWasteKg: r.wetWasteKg,
              brownWasteKg: r.brownWasteKg,
              leachateL: r.leachateL,
              harvestKg: r.harvestKg,
            },
          });
        } else {
          created += 1;
          await tx.ingestionRow.create({ data: r });
        }
      }
    });
  } catch {
    return jsonError(databaseErrorMessage(), 500);
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    total: created + updated,
    skipped: parsed.errors.length,
    errors: parsed.errors,
  });
}

