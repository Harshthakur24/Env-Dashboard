import * as XLSX from "xlsx";
import { z } from "zod";
import { REQUIRED_COLUMNS, type RequiredColumn } from "./constants";
import { ingestionRowSchema, type IngestionRowInput } from "./schema";

const MAX_ROWS = 50_000;

function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const requiredNormalized = new Map<string, RequiredColumn>(
  REQUIRED_COLUMNS.map((c) => [normalizeHeader(c), c]),
);

function isBlankCell(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date -> JS date
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts) return null;
    const d = new Date(
      Date.UTC(parts.y, (parts.m ?? 1) - 1, parts.d ?? 1, parts.H ?? 0, parts.M ?? 0, parts.S ?? 0),
    );
    if (Number.isNaN(d.valueOf())) return null;
    return d;
  }

  const s = String(value ?? "").trim();
  if (!s) return null;

  // Common spreadsheet formats (we normalize to UTC midnight later anyway)
  // - dd-mm-yyyy
  // - dd/mm/yyyy
  // - dd.mm.yyyy
  // - yyyy-mm-dd
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const yyyy = Number(iso[1]);
    const mm = Number(iso[2]);
    const dd = Number(iso[3]);
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (Number.isNaN(d.valueOf())) return null;
    // Validate round-trip (e.g. 31/02 should fail)
    if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
    return d;
  }

  const dmy = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s);
  if (dmy) {
    const rawYear = Number(dmy[3]);
    const yyyy = rawYear < 100 ? 2000 + rawYear : rawYear;

    // Try dd/mm/yyyy (common in many locales)
    const dd1 = Number(dmy[1]);
    const mm1 = Number(dmy[2]);
    const d1 = new Date(Date.UTC(yyyy, mm1 - 1, dd1));
    if (
      !Number.isNaN(d1.valueOf()) &&
      d1.getUTCFullYear() === yyyy &&
      d1.getUTCMonth() === mm1 - 1 &&
      d1.getUTCDate() === dd1
    ) {
      return d1;
    }

    // Try mm/dd/yyyy (US-style) e.g. 10/13/25
    const mm2 = Number(dmy[1]);
    const dd2 = Number(dmy[2]);
    const d2 = new Date(Date.UTC(yyyy, mm2 - 1, dd2));
    if (
      !Number.isNaN(d2.valueOf()) &&
      d2.getUTCFullYear() === yyyy &&
      d2.getUTCMonth() === mm2 - 1 &&
      d2.getUTCDate() === dd2
    ) {
      return d2;
    }

    return null;
  }

  // Fallback: let Date try (ISO strings etc.)
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return null;
  return d;
}

export type ParseError = {
  row: number; // 1-based data row index (excluding header)
  message: string;
};

export type ParseResult = {
  rows: IngestionRowInput[];
  errors: ParseError[];
  headerMap: Record<RequiredColumn, string>;
};

export function parseIngestionWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Workbook has no sheets." }],
      headerMap: {} as Record<RequiredColumn, string>,
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "Sheet is empty." }], headerMap: {} as Record<RequiredColumn, string> };
  }

  if (rows.length > MAX_ROWS) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Too many rows (${rows.length}). Max supported is ${MAX_ROWS}.` }],
      headerMap: {} as Record<RequiredColumn, string>,
    };
  }

  // Map actual headers in the file -> required columns (case/space-insensitive)
  const fileHeaders = Object.keys(rows[0] ?? {});
  const headerMap = new Map<RequiredColumn, string>();
  for (const h of fileHeaders) {
    const req = requiredNormalized.get(normalizeHeader(h));
    if (req) headerMap.set(req, h);
  }

  const missing = REQUIRED_COLUMNS.filter((c) => !headerMap.has(c));
  if (missing.length) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }],
      headerMap: {} as Record<RequiredColumn, string>,
    };
  }

  const parsed: IngestionRowInput[] = [];
  const errors: ParseError[] = [];

  rows.forEach((r, idx) => {
    const dataRow = idx + 1;

    const locationRaw = r[headerMap.get("Name of the Project Location")!];
    const visitDateRaw = r[headerMap.get("Date of Visit")!];
    const compostersRaw = r[headerMap.get("No. of composters")!];
    const wetWasteRaw = r[headerMap.get("Sum of Wet Waste (Kg)")!];
    const brownWasteRaw = r[headerMap.get("Sum of Brown Waste (Kg)")!];
    const leachateRaw = r[headerMap.get("Sum of Leachate (Litre)")!];
    const harvestRaw = r[headerMap.get("Sum of Harvest (Kg)")!];

    // Skip fully blank rows (common in real Excel exports)
    const isBlankRow =
      isBlankCell(locationRaw) &&
      isBlankCell(visitDateRaw) &&
      isBlankCell(compostersRaw) &&
      isBlankCell(wetWasteRaw) &&
      isBlankCell(brownWasteRaw) &&
      isBlankCell(leachateRaw) &&
      isBlankCell(harvestRaw);
    if (isBlankRow) return;

    const visitDate = parseDate(visitDateRaw);
    const composters = parseNumber(compostersRaw);
    const wetWasteKg = parseNumber(wetWasteRaw);
    const brownWasteKg = parseNumber(brownWasteRaw);
    const leachateL = parseNumber(leachateRaw);
    const harvestKg = parseNumber(harvestRaw);

    if (!visitDate) {
      errors.push({
        row: dataRow,
        message: `Invalid Date of Visit: ${String(visitDateRaw ?? "").trim() || "(empty)"}`,
      });
      return;
    }

    const candidate = {
      location: String(locationRaw ?? "").trim(),
      visitDate,
      composters: composters ?? Number.NaN,
      wetWasteKg: wetWasteKg ?? Number.NaN,
      brownWasteKg: brownWasteKg ?? Number.NaN,
      leachateL: leachateL ?? Number.NaN,
      harvestKg: harvestKg ?? Number.NaN,
    };

    const res = ingestionRowSchema.safeParse(candidate);
    if (!res.success) {
      const msg = z
        .prettifyError(res.error)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("; ");
      errors.push({ row: dataRow, message: msg || "Invalid row." });
      return;
    }

    // Normalize to midnight UTC for consistent uniqueness
    const d = res.data.visitDate;
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    parsed.push({ ...res.data, visitDate: normalizedDate });
  });

  return {
    rows: parsed,
    errors,
    headerMap: Object.fromEntries(headerMap.entries()) as Record<RequiredColumn, string>,
  };
}

