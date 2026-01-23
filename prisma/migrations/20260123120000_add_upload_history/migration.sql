-- CreateTable
CREATE TABLE "UploadHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "skipped" INTEGER,
    "errorCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadHistory_createdAt_idx" ON "UploadHistory"("createdAt");
