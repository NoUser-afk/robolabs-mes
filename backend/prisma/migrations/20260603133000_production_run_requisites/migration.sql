ALTER TABLE "ProductionRunRecord" ADD COLUMN "orderId" INTEGER;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "orderNumber" VARCHAR(20);
ALTER TABLE "ProductionRunRecord" ADD COLUMN "productId" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "productCode" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "productName" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "quantity" INTEGER;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "status" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "priority" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "operator" TEXT;
ALTER TABLE "ProductionRunRecord" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "ProductionRunRecord" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "ProductionRunRecord"
SET
  "orderId" = NULLIF("data"->>'orderId', '')::INTEGER,
  "orderNumber" = LEFT(NULLIF("data"->>'orderNumber', ''), 20),
  "productId" = NULLIF("data"->>'productId', ''),
  "productCode" = NULLIF("data"->>'productCode', ''),
  "productName" = NULLIF("data"->>'productName', ''),
  "quantity" = NULLIF("data"->>'quantity', '')::INTEGER,
  "status" = NULLIF("data"->>'status', ''),
  "priority" = NULLIF("data"->>'priority', ''),
  "operator" = NULLIF("data"->>'operator', ''),
  "startedAt" = NULLIF("data"->>'startedAt', '')::TIMESTAMP(3),
  "completedAt" = NULLIF("data"->>'completedAt', '')::TIMESTAMP(3)
WHERE "id" <> '__legacy_import_completed__';

CREATE INDEX "ProductionRunRecord_orderNumber_idx" ON "ProductionRunRecord"("orderNumber");
CREATE INDEX "ProductionRunRecord_productCode_idx" ON "ProductionRunRecord"("productCode");
CREATE INDEX "ProductionRunRecord_status_idx" ON "ProductionRunRecord"("status");
