import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const rows = [
    {
      location: "Manav Rachna University",
      visitDate: new Date(Date.UTC(2025, 9, 7)),
      composters: 4,
      wetWasteKg: 55,
      brownWasteKg: 6,
      leachateL: 0,
      harvestKg: 0,
    },
    {
      location: "Manav Rachna University",
      visitDate: new Date(Date.UTC(2025, 9, 8)),
      composters: 4,
      wetWasteKg: 28,
      brownWasteKg: 4,
      leachateL: 0,
      harvestKg: 0,
    },
    {
      location: "Manav Rachna University",
      visitDate: new Date(Date.UTC(2025, 9, 9)),
      composters: 4,
      wetWasteKg: 52,
      brownWasteKg: 4.5,
      leachateL: 0,
      harvestKg: 0,
    },
  ];

  for (const r of rows) {
    await db.ingestionRow.upsert({
      where: { location_visitDate: { location: r.location, visitDate: r.visitDate } },
      create: r,
      update: {
        composters: r.composters,
        wetWasteKg: r.wetWasteKg,
        brownWasteKg: r.brownWasteKg,
        leachateL: r.leachateL,
        harvestKg: r.harvestKg,
      },
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

