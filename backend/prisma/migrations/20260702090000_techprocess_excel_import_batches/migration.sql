CREATE TABLE "TechProcessImportBatch" (
  "id" SERIAL NOT NULL,
  "fileName" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedBy" TEXT,
  "status" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "processId" TEXT,
  "productCode" TEXT,
  "versionId" TEXT,
  "versionNo" INTEGER,
  "operationsCount" INTEGER NOT NULL DEFAULT 0,
  "totalNormHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "warningsJson" JSONB,
  "errorsJson" JSONB,
  "previewJson" JSONB,

  CONSTRAINT "TechProcessImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TechProcessImportBatch_uploadedAt_idx" ON "TechProcessImportBatch"("uploadedAt");
CREATE INDEX "TechProcessImportBatch_processId_idx" ON "TechProcessImportBatch"("processId");
CREATE INDEX "TechProcessImportBatch_productCode_idx" ON "TechProcessImportBatch"("productCode");
CREATE INDEX "TechProcessImportBatch_versionId_idx" ON "TechProcessImportBatch"("versionId");
CREATE INDEX "TechProcessImportBatch_status_idx" ON "TechProcessImportBatch"("status");
