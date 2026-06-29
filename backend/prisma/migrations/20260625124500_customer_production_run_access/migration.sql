CREATE TABLE IF NOT EXISTS "CustomerProductionRunAccess" (
  "id" SERIAL NOT NULL,
  "runId" TEXT NOT NULL,
  "accessCodeHash" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  CONSTRAINT "CustomerProductionRunAccess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerProductionRunAccess_runId_disabledAt_idx" ON "CustomerProductionRunAccess"("runId", "disabledAt");
CREATE INDEX IF NOT EXISTS "CustomerProductionRunAccess_createdAt_idx" ON "CustomerProductionRunAccess"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerProductionRunAccess_runId_fkey'
  ) THEN
    ALTER TABLE "CustomerProductionRunAccess"
      ADD CONSTRAINT "CustomerProductionRunAccess_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
