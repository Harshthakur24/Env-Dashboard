import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

function buildPoolConfig(): PoolConfig {
  const originalConnectionString = process.env.DATABASE_URL;
  let connectionString = originalConnectionString;
  const cfg: PoolConfig = { connectionString };

  // Silence upcoming pg-connection-string warning and keep current behavior:
  // treat sslmode=require/prefer/verify-ca as verify-full explicitly.
  // Only rewrite when sslmode is already present (don't force SSL for local dev).
  if (typeof connectionString === "string" && connectionString.length > 0) {
    try {
      const url = new URL(connectionString);
      const sslmode = url.searchParams.get("sslmode");
      if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
        url.searchParams.set("sslmode", "verify-full");
        connectionString = url.toString();
        cfg.connectionString = connectionString;
      }
    } catch {
      // ignore
    }
  }

  // If DATABASE_URL omits the password (e.g. postgresql://user@host/db),
  // pg ends up with password=null which breaks SCRAM auth.
  // Fall back to common env vars.
  const fallbackPassword =
    process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? process.env.DB_PASSWORD ?? process.env.DATABASE_PASSWORD;

  if (typeof fallbackPassword === "string" && fallbackPassword.length > 0) {
    try {
      if (typeof connectionString === "string" && connectionString.length > 0) {
        const url = new URL(connectionString);
        if (!url.password) cfg.password = fallbackPassword;
      } else {
        cfg.password = fallbackPassword;
      }
    } catch {
      // If DATABASE_URL is malformed, don't guess; let pg/prisma throw a clear error.
    }
  }

  return cfg;
}

const pool =
  globalThis.prismaPool ??
  new Pool(buildPoolConfig());

if (process.env.NODE_ENV !== "production") globalThis.prismaPool = pool;

const adapter = new PrismaPg(pool);

export const db =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

