-- AlterTable
ALTER TABLE "IngestionRow" ADD COLUMN "uploadId" TEXT;

-- CreateIndex
CREATE INDEX "IngestionRow_uploadId_idx" ON "IngestionRow"("uploadId");

-- AddForeignKey
ALTER TABLE "IngestionRow" ADD CONSTRAINT "IngestionRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "UploadHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
