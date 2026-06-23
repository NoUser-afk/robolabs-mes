CREATE TABLE IF NOT EXISTS "ProductionRun" (
  "id" TEXT NOT NULL,
  "legacyRecordId" TEXT,
  "orderId" INTEGER,
  "orderNumber" VARCHAR(20),
  "productId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "totalQuantity" INTEGER,
  "launchedQuantity" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "priorityRank" INTEGER,
  "operator" TEXT,
  "comment" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "testData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionUnit" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "unitNo" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionUnitOperation" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "unitId" TEXT,
  "operationId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "level" INTEGER,
  "partOrAssembly" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "previousOperationCodes" TEXT[],
  "nextOperationCodes" TEXT[],
  "normHours" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "priorityRank" INTEGER,
  "lockedBy" TEXT,
  "lockedAt" TIMESTAMP(3),
  "lockReason" TEXT,
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionUnitOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionOperationEvent" (
  "id" SERIAL NOT NULL,
  "runId" TEXT NOT NULL,
  "unitId" TEXT,
  "operationPk" TEXT,
  "eventType" TEXT NOT NULL,
  "actor" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,
  CONSTRAINT "ProductionOperationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductionRun_orderNumber_idx" ON "ProductionRun"("orderNumber");
CREATE INDEX IF NOT EXISTS "ProductionRun_productCode_idx" ON "ProductionRun"("productCode");
CREATE INDEX IF NOT EXISTS "ProductionRun_status_idx" ON "ProductionRun"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionUnit_runId_unitNo_key" ON "ProductionUnit"("runId", "unitNo");
CREATE INDEX IF NOT EXISTS "ProductionUnit_runId_status_idx" ON "ProductionUnit"("runId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionUnitOperation_runId_unitId_operationId_key" ON "ProductionUnitOperation"("runId", "unitId", "operationId");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_runId_status_idx" ON "ProductionUnitOperation"("runId", "status");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_unitId_status_idx" ON "ProductionUnitOperation"("unitId", "status");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_section_status_idx" ON "ProductionUnitOperation"("section", "status");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_runId_timestamp_idx" ON "ProductionOperationEvent"("runId", "timestamp");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_unitId_idx" ON "ProductionOperationEvent"("unitId");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_operationPk_idx" ON "ProductionOperationEvent"("operationPk");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_eventType_idx" ON "ProductionOperationEvent"("eventType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionUnit_runId_fkey'
  ) THEN
    ALTER TABLE "ProductionUnit"
      ADD CONSTRAINT "ProductionUnit_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionUnitOperation_runId_fkey'
  ) THEN
    ALTER TABLE "ProductionUnitOperation"
      ADD CONSTRAINT "ProductionUnitOperation_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionUnitOperation_unitId_fkey'
  ) THEN
    ALTER TABLE "ProductionUnitOperation"
      ADD CONSTRAINT "ProductionUnitOperation_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOperationEvent_runId_fkey'
  ) THEN
    ALTER TABLE "ProductionOperationEvent"
      ADD CONSTRAINT "ProductionOperationEvent_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOperationEvent_unitId_fkey'
  ) THEN
    ALTER TABLE "ProductionOperationEvent"
      ADD CONSTRAINT "ProductionOperationEvent_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOperationEvent_operationPk_fkey'
  ) THEN
    ALTER TABLE "ProductionOperationEvent"
      ADD CONSTRAINT "ProductionOperationEvent_operationPk_fkey"
      FOREIGN KEY ("operationPk") REFERENCES "ProductionUnitOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
