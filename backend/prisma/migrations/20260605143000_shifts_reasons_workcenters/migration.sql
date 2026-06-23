ALTER TABLE "TimeTracking" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "TimeTracking" ADD COLUMN IF NOT EXISTS "timeCategory" TEXT;
ALTER TABLE "TimeTracking" ADD COLUMN IF NOT EXISTS "shiftId" INTEGER;

ALTER TABLE "QualityRecord" ADD COLUMN IF NOT EXISTS "reworkQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QualityRecord" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "QualityRecord" ADD COLUMN IF NOT EXISTS "responsibleOperationCode" TEXT;
ALTER TABLE "QualityRecord" ADD COLUMN IF NOT EXISTS "inspector" TEXT;
ALTER TABLE "QualityRecord" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'recorded';

ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "shiftId" INTEGER;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "pauseReasonCode" TEXT;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "deviationReasonCode" TEXT;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "timeCategory" TEXT;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "acceptedQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "defectQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "reworkQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductionUnitOperation" ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT;

ALTER TABLE "ProductionOperationEvent" ADD COLUMN IF NOT EXISTS "shiftId" INTEGER;
ALTER TABLE "ProductionOperationEvent" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "ProductionOperationEvent" ADD COLUMN IF NOT EXISTS "timeCategory" TEXT;

CREATE TABLE IF NOT EXISTS "WorkCenter" (
  "id" SERIAL NOT NULL,
  "section" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacityHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
  "workType" TEXT,
  "masterPersonId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkShift" (
  "id" SERIAL NOT NULL,
  "shiftDate" TIMESTAMP(3) NOT NULL,
  "section" TEXT NOT NULL,
  "workCenterId" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "brigade" TEXT,
  "master" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "closeComment" TEXT,
  "disputedJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionCalendarDay" (
  "id" SERIAL NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "dayType" TEXT NOT NULL DEFAULT 'workday',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionCalendarDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DeviationReason" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "timeCategory" TEXT NOT NULL,
  "affectsWorkerKpi" BOOLEAN NOT NULL DEFAULT true,
  "requiresSupervisorNote" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviationReason_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" SERIAL NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkCenter_section_name_key" ON "WorkCenter"("section", "name");
CREATE INDEX IF NOT EXISTS "WorkCenter_section_idx" ON "WorkCenter"("section");
CREATE INDEX IF NOT EXISTS "WorkCenter_masterPersonId_idx" ON "WorkCenter"("masterPersonId");
CREATE INDEX IF NOT EXISTS "WorkShift_shiftDate_idx" ON "WorkShift"("shiftDate");
CREATE INDEX IF NOT EXISTS "WorkShift_section_startsAt_endsAt_idx" ON "WorkShift"("section", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "WorkShift_status_idx" ON "WorkShift"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionCalendarDay_date_key" ON "ProductionCalendarDay"("date");
CREATE INDEX IF NOT EXISTS "DeviationReason_category_idx" ON "DeviationReason"("category");
CREATE INDEX IF NOT EXISTS "DeviationReason_timeCategory_idx" ON "DeviationReason"("timeCategory");
CREATE INDEX IF NOT EXISTS "DeviationReason_isActive_idx" ON "DeviationReason"("isActive");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "TimeTracking_shiftId_idx" ON "TimeTracking"("shiftId");
CREATE INDEX IF NOT EXISTS "TimeTracking_reasonCode_idx" ON "TimeTracking"("reasonCode");
CREATE INDEX IF NOT EXISTS "QualityRecord_reasonCode_idx" ON "QualityRecord"("reasonCode");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_shiftId_idx" ON "ProductionUnitOperation"("shiftId");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_pauseReasonCode_idx" ON "ProductionUnitOperation"("pauseReasonCode");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_deviationReasonCode_idx" ON "ProductionUnitOperation"("deviationReasonCode");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_shiftId_idx" ON "ProductionOperationEvent"("shiftId");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_reasonCode_idx" ON "ProductionOperationEvent"("reasonCode");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkCenter_section_fkey') THEN
    ALTER TABLE "WorkCenter" ADD CONSTRAINT "WorkCenter_section_fkey" FOREIGN KEY ("section") REFERENCES "ReferenceSection"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkCenter_masterPersonId_fkey') THEN
    ALTER TABLE "WorkCenter" ADD CONSTRAINT "WorkCenter_masterPersonId_fkey" FOREIGN KEY ("masterPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkShift_workCenterId_fkey') THEN
    ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimeTracking_shiftId_fkey') THEN
    ALTER TABLE "TimeTracking" ADD CONSTRAINT "TimeTracking_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "WorkShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionUnitOperation_shiftId_fkey') THEN
    ALTER TABLE "ProductionUnitOperation" ADD CONSTRAINT "ProductionUnitOperation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "WorkShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOperationEvent_shiftId_fkey') THEN
    ALTER TABLE "ProductionOperationEvent" ADD CONSTRAINT "ProductionOperationEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "WorkShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "DeviationReason" ("code", "name", "category", "timeCategory", "affectsWorkerKpi", "requiresSupervisorNote", "sortOrder")
VALUES
  ('NO_MATERIAL', 'Нет материала от ERP/склада', 'external', 'organizational_downtime', false, false, 10),
  ('NO_DOCUMENTATION', 'Нет КД/ТД', 'external', 'organizational_downtime', false, false, 20),
  ('WAIT_PREVIOUS_STAGE', 'Ожидание предыдущего этапа', 'external', 'waiting_previous_stage', false, false, 30),
  ('EQUIPMENT_BREAKDOWN', 'Поломка оборудования', 'technical', 'technical_downtime', false, true, 40),
  ('CHANGEOVER', 'Переналадка', 'technical', 'technical_downtime', false, false, 50),
  ('REWORK_FIX', 'Исправление брака', 'quality', 'worker_pause', true, true, 60),
  ('HELP_OTHER_SECTION', 'Помощь другому участку', 'organizational', 'organizational_downtime', false, false, 70),
  ('ORG_DOWNTIME', 'Организационный простой', 'organizational', 'organizational_downtime', false, true, 80),
  ('OPERATOR_ERROR', 'Ошибка исполнителя', 'worker', 'worker_pause', true, true, 90),
  ('OTHER', 'Прочее', 'other', 'worker_pause', true, true, 100)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "timeCategory" = EXCLUDED."timeCategory",
  "affectsWorkerKpi" = EXCLUDED."affectsWorkerKpi",
  "requiresSupervisorNote" = EXCLUDED."requiresSupervisorNote",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
