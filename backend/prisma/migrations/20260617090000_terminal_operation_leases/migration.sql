ALTER TABLE "ProductionUnitOperation"
ADD COLUMN IF NOT EXISTS "lockToken" TEXT,
ADD COLUMN IF NOT EXISTS "lockTerminalId" TEXT,
ADD COLUMN IF NOT EXISTS "lockClientId" TEXT,
ADD COLUMN IF NOT EXISTS "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lockVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "selectedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_section_status_lockExpiresAt_idx"
ON "ProductionUnitOperation"("section", "status", "lockExpiresAt");

CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_lockToken_idx"
ON "ProductionUnitOperation"("lockToken");

CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_lockExpiresAt_idx"
ON "ProductionUnitOperation"("lockExpiresAt");
