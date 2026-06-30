ALTER TABLE "NomenclatureProcessRecord"
  ADD COLUMN "activeVersionId" TEXT,
  ADD COLUMN "versionCounter" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "NomenclatureProcessVersion" (
  "id" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "versionNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "equipment" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "operationsCount" INTEGER NOT NULL DEFAULT 0,
  "totalNormHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" TEXT NOT NULL DEFAULT 'manual',
  "comment" TEXT,
  "createdBy" TEXT,
  "activatedBy" TEXT,
  "activatedAt" TIMESTAMP(3),
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NomenclatureProcessVersion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NomenclatureProcessVersion" (
  "id",
  "processId",
  "versionNo",
  "status",
  "equipment",
  "productCode",
  "category",
  "operationsCount",
  "totalNormHours",
  "confidence",
  "comment",
  "createdBy",
  "activatedBy",
  "activatedAt",
  "data",
  "createdAt",
  "updatedAt"
)
SELECT
  "id" || '-v1',
  "id",
  1,
  'active',
  "equipment",
  "productCode",
  "category",
  "operationsCount",
  "totalNormHours",
  "confidence",
  'Initial version from existing tech process',
  NULL,
  NULL,
  "updatedAt",
  "data",
  "createdAt",
  "updatedAt"
FROM "NomenclatureProcessRecord";

UPDATE "NomenclatureProcessRecord"
SET "activeVersionId" = "id" || '-v1',
    "versionCounter" = 1;

ALTER TABLE "ProductionRunRecord"
  ADD COLUMN "processVersionId" TEXT,
  ADD COLUMN "processVersionNo" INTEGER;

ALTER TABLE "ProductionRun"
  ADD COLUMN "processVersionId" TEXT,
  ADD COLUMN "processVersionNo" INTEGER,
  ADD COLUMN "processSourceId" TEXT,
  ADD COLUMN "processSnapshotAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "NomenclatureProcessVersion_processId_versionNo_key" ON "NomenclatureProcessVersion"("processId", "versionNo");
CREATE INDEX "NomenclatureProcessVersion_processId_status_idx" ON "NomenclatureProcessVersion"("processId", "status");
CREATE INDEX "NomenclatureProcessVersion_productCode_idx" ON "NomenclatureProcessVersion"("productCode");
CREATE INDEX "NomenclatureProcessVersion_category_idx" ON "NomenclatureProcessVersion"("category");
CREATE INDEX "NomenclatureProcessRecord_activeVersionId_idx" ON "NomenclatureProcessRecord"("activeVersionId");
CREATE INDEX "ProductionRunRecord_processVersionId_idx" ON "ProductionRunRecord"("processVersionId");
CREATE INDEX "ProductionRun_processVersionId_idx" ON "ProductionRun"("processVersionId");

ALTER TABLE "NomenclatureProcessVersion"
  ADD CONSTRAINT "NomenclatureProcessVersion_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "NomenclatureProcessRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
