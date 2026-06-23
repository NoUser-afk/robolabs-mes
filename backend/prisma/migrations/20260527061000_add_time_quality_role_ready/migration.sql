-- Safe additive migration for operation lifecycle, time tracking, quality and role-ready users.
-- No enum alteration, data deletion, truncate or reset operations are used.

ALTER TABLE "OrderOperation"
  ADD COLUMN IF NOT EXISTS "lifecycleStatus" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "pauseHours" DOUBLE PRECISION DEFAULT 0;

CREATE TABLE IF NOT EXISTS "TimeTracking" (
  "id" SERIAL PRIMARY KEY,
  "orderOperationId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "personId" INTEGER,
  "kind" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationMinutes" INTEGER,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeTracking_orderOperationId_fkey" FOREIGN KEY ("orderOperationId") REFERENCES "OrderOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TimeTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TimeTracking_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TimeTracking_orderOperationId_kind_endedAt_idx" ON "TimeTracking"("orderOperationId", "kind", "endedAt");
CREATE INDEX IF NOT EXISTS "TimeTracking_orderId_idx" ON "TimeTracking"("orderId");

CREATE TABLE IF NOT EXISTS "QualityRecord" (
  "id" SERIAL PRIMARY KEY,
  "orderOperationId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "personId" INTEGER,
  "checkedQty" INTEGER NOT NULL DEFAULT 0,
  "acceptedQty" INTEGER NOT NULL DEFAULT 0,
  "defectQty" INTEGER NOT NULL DEFAULT 0,
  "defectReason" TEXT,
  "comment" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QualityRecord_orderOperationId_fkey" FOREIGN KEY ("orderOperationId") REFERENCES "OrderOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QualityRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QualityRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "QualityRecord_orderOperationId_idx" ON "QualityRecord"("orderOperationId");
CREATE INDEX IF NOT EXISTS "QualityRecord_orderId_idx" ON "QualityRecord"("orderId");

CREATE TABLE IF NOT EXISTS "AppUser" (
  "id" SERIAL PRIMARY KEY,
  "login" TEXT NOT NULL UNIQUE,
  "role" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "personId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppUser_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
