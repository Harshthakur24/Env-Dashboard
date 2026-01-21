import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load env the same way Next.js commonly does.
loadEnv({ path: ".env.local" });
loadEnv();

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/env_dashboard?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DATABASE_URL,
  },
});

