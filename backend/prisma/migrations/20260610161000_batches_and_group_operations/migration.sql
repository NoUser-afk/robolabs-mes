ALTER TABLE "ProductionRun"
ADD COLUMN "batchNumber" TEXT,
ADD COLUMN "batchName" TEXT,
ADD COLUMN "batchCreatedBy" TEXT,
ADD COLUMN "batchSource" TEXT;

UPDATE "ProductionRun"
SET
  "batchNumber" = COALESCE("batchNumber", "id"),
  "batchName" = COALESCE("batchName", CONCAT("productName", ' · ', "quantity", ' шт.')),
  "batchCreatedBy" = COALESCE("batchCreatedBy", "operator"),
  "batchSource" = COALESCE("batchSource", CASE WHEN "orderNumber" IS NULL THEN 'manual-selection' ELSE 'order-selection' END);

ALTER TABLE "ProductionUnitOperation"
ADD COLUMN "groupCapable" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProductionUnitOperation"
SET "groupCapable" = true
WHERE lower(COALESCE("name", '') || ' ' || COALESCE("section", '')) LIKE '%лазер%'
   OR lower(COALESCE("name", '') || ' ' || COALESCE("section", '')) LIKE '%зачист%'
   OR lower(COALESCE("name", '') || ' ' || COALESCE("section", '')) LIKE '%пробив%'
   OR lower(COALESCE("name", '') || ' ' || COALESCE("section", '')) LIKE '%координат%';

CREATE INDEX "ProductionRun_batchNumber_idx" ON "ProductionRun"("batchNumber");
CREATE INDEX "ProductionUnitOperation_groupCapable_idx" ON "ProductionUnitOperation"("groupCapable");
