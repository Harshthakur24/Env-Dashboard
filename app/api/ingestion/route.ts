import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseIngestionWorkbook } from "@/lib/ingestion/parse";
import { join, sqltag } from "@prisma/client/runtime/client";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  try {
    const rows = await db.ingestionRow.findMany({
      where: {
        ...(location ? { location } : {}),
        ...(from || to
          ? {
              visitDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
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

  let parsed: ReturnType<typeof parseIngestionWorkbook>;
  try {
    const buffer = await file.arrayBuffer();
    parsed = parseIngestionWorkbook(buffer);
  } catch {
    return jsonError("Could not read/parse this Excel file. Please re-save it as .xlsx and try again.", 400);
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { ok: false, message: "No valid rows found to ingest.", errors: parsed.errors, headerMap: parsed.headerMap },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;

  try {
    // Avoid Prisma interactive transactions (default 5s timeout on some providers like Neon).
    // Use batched SQL UPSERTs instead: much faster and no interactive tx timeout.
    const BATCH_SIZE = 500;

    for (const batch of chunk(parsed.rows, BATCH_SIZE)) {
      const values = batch.map(
        (r) =>
          sqltag`(${randomUUID()}, ${r.location}, ${r.visitDate}, ${r.composters}, ${r.wetWasteKg}, ${r.brownWasteKg}, ${r.leachateL}, ${r.harvestKg}, NOW(), NOW())`,
      );

      const res = await db.$queryRaw<{ inserted: boolean }[]>(sqltag`
        INSERT INTO "IngestionRow"
          ("id","location","visitDate","composters","wetWasteKg","brownWasteKg","leachateL","harvestKg","createdAt","updatedAt")
        VALUES ${join(values)}
        ON CONFLICT ("location","visitDate") DO UPDATE SET
          "composters" = EXCLUDED."composters",
          "wetWasteKg" = EXCLUDED."wetWasteKg",
          "brownWasteKg" = EXCLUDED."brownWasteKg",
          "leachateL" = EXCLUDED."leachateL",
          "harvestKg" = EXCLUDED."harvestKg",
          "updatedAt" = NOW()
        RETURNING (xmax = 0) AS inserted
      `);

      const createdBatch = res.reduce((acc: number, r: { inserted: boolean }) => acc + (r.inserted ? 1 : 0), 0);
      created += createdBatch;
      updated += res.length - createdBatch;
    }
  } catch {
    return jsonError(databaseErrorMessage(), 500);
  }

  let history: { id: string; createdAt: Date } | null = null;
  try {
    history = await db.uploadHistory.create({
      data: {
        fileName: file.name,
        created,
        updated,
        total: created + updated,
        skipped: parsed.errors.length || 0,
        errorCount: parsed.errors.length || 0,
      },
      select: { id: true, createdAt: true },
    });
  } catch {
    // If history write fails, still return ingestion success.
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    total: created + updated,
    skipped: parsed.errors.length,
    errors: parsed.errors,
    history,
  });
}

