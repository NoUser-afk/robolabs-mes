CREATE INDEX IF NOT EXISTS "ProductionRun_orderId_status_idx" ON "ProductionRun"("orderId", "status");
CREATE INDEX IF NOT EXISTS "ProductionRun_archived_testData_status_idx" ON "ProductionRun"("archived", "testData", "status");

CREATE INDEX IF NOT EXISTS "ProductionUnit_status_updatedAt_idx" ON "ProductionUnit"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_runId_unitId_status_idx" ON "ProductionUnitOperation"("runId", "unitId", "status");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_section_status_updatedAt_idx" ON "ProductionUnitOperation"("section", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ProductionUnitOperation_operationId_status_idx" ON "ProductionUnitOperation"("operationId", "status");

CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_runId_eventType_timestamp_idx" ON "ProductionOperationEvent"("runId", "eventType", "timestamp");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_unitId_timestamp_idx" ON "ProductionOperationEvent"("unitId", "timestamp");
CREATE INDEX IF NOT EXISTS "ProductionOperationEvent_timestamp_idx" ON "ProductionOperationEvent"("timestamp");
