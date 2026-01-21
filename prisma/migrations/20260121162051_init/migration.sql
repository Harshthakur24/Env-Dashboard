-- CreateTable
CREATE TABLE "IngestionRow" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "composters" INTEGER NOT NULL,
    "wetWasteKg" DOUBLE PRECISION NOT NULL,
    "brownWasteKg" DOUBLE PRECISION NOT NULL,
    "leachateL" DOUBLE PRECISION NOT NULL,
    "harvestKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionRow_visitDate_idx" ON "IngestionRow"("visitDate");

-- CreateIndex
CREATE INDEX "IngestionRow_location_idx" ON "IngestionRow"("location");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionRow_location_visitDate_key" ON "IngestionRow"("location", "visitDate");
