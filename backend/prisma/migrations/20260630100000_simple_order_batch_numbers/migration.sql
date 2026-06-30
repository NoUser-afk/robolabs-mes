ALTER TABLE "ProductionRunRecord"
  ADD COLUMN "orderYear" INTEGER,
  ADD COLUMN "orderScopeKey" TEXT,
  ADD COLUMN "orderBatchNo" INTEGER,
  ADD COLUMN "orderUnitFrom" INTEGER,
  ADD COLUMN "orderUnitTo" INTEGER,
  ADD COLUMN "orderBatchCode" TEXT;

ALTER TABLE "ProductionRun"
  ADD COLUMN "orderYear" INTEGER,
  ADD COLUMN "orderScopeKey" TEXT,
  ADD COLUMN "orderBatchNo" INTEGER,
  ADD COLUMN "orderUnitFrom" INTEGER,
  ADD COLUMN "orderUnitTo" INTEGER,
  ADD COLUMN "orderBatchCode" TEXT;

UPDATE "ProductionRunRecord"
SET
  "orderYear" = NULLIF(data->>'orderYear', '')::INTEGER,
  "orderScopeKey" = NULLIF(data->>'orderScopeKey', ''),
  "orderBatchNo" = NULLIF(data->>'orderBatchNo', '')::INTEGER,
  "orderUnitFrom" = NULLIF(data->>'orderUnitFrom', '')::INTEGER,
  "orderUnitTo" = NULLIF(data->>'orderUnitTo', '')::INTEGER,
  "orderBatchCode" = NULLIF(data->>'orderBatchCode', '')
WHERE data IS NOT NULL;

UPDATE "ProductionRun"
SET
  "orderYear" = NULLIF(record.data->>'orderYear', '')::INTEGER,
  "orderScopeKey" = NULLIF(record.data->>'orderScopeKey', ''),
  "orderBatchNo" = NULLIF(record.data->>'orderBatchNo', '')::INTEGER,
  "orderUnitFrom" = NULLIF(record.data->>'orderUnitFrom', '')::INTEGER,
  "orderUnitTo" = NULLIF(record.data->>'orderUnitTo', '')::INTEGER,
  "orderBatchCode" = NULLIF(record.data->>'orderBatchCode', '')
FROM "ProductionRunRecord" record
WHERE record.id = "ProductionRun"."legacyRecordId"
  AND record.data IS NOT NULL;

CREATE INDEX "ProductionRunRecord_orderScopeKey_idx" ON "ProductionRunRecord"("orderScopeKey");
CREATE INDEX "ProductionRunRecord_orderBatchCode_idx" ON "ProductionRunRecord"("orderBatchCode");
CREATE INDEX "ProductionRun_orderScopeKey_idx" ON "ProductionRun"("orderScopeKey");
CREATE INDEX "ProductionRun_orderBatchCode_idx" ON "ProductionRun"("orderBatchCode");
