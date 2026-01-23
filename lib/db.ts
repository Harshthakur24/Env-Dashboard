import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

const originalConnectionString = process.env.DATABASE_URL;
let connectionString = originalConnectionString;

if (typeof connectionString === "string" && connectionString.length > 0) {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      connectionString = url.toString();
    }
  } catch {
    // ignore malformed connection string
  }
}

const pool =
  globalThis.prismaPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") globalThis.prismaPool = pool;

export const db =
  globalThis.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

