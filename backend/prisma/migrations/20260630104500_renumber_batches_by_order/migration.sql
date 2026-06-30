WITH ranked AS (
  SELECT
    id,
    "orderId",
    "orderNumber",
    COALESCE("orderYear", EXTRACT(YEAR FROM "createdAt")::INTEGER) AS batch_year,
    ROW_NUMBER() OVER (
      PARTITION BY "orderNumber", COALESCE("orderYear", EXTRACT(YEAR FROM "createdAt")::INTEGER)
      ORDER BY "createdAt", id
    ) AS batch_no,
    SUM(COALESCE("launchedQuantity", quantity, 1)) OVER (
      PARTITION BY "orderNumber", COALESCE("orderYear", EXTRACT(YEAR FROM "createdAt")::INTEGER)
      ORDER BY "createdAt", id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS quantity_before
  FROM "ProductionRun"
  WHERE "orderNumber" IS NOT NULL
)
UPDATE "ProductionRun" run
SET
  "orderYear" = ranked.batch_year,
  "orderScopeKey" = CASE
    WHEN ranked."orderId" IS NOT NULL THEN 'id:' || ranked."orderId"
    ELSE 'number:' || ranked."orderNumber" || ':' || ranked.batch_year
  END,
  "orderBatchNo" = ranked.batch_no,
  "orderUnitFrom" = COALESCE(ranked.quantity_before, 0) + 1,
  "orderUnitTo" = COALESCE(ranked.quantity_before, 0) + COALESCE(run."launchedQuantity", run.quantity, 1),
  "orderBatchCode" = ranked."orderNumber" || '-' || ranked.batch_no,
  "batchNumber" = ranked."orderNumber" || '-' || ranked.batch_no,
  "batchName" = ranked."orderNumber" || '-' || ranked.batch_no || ' · units ' || (COALESCE(ranked.quantity_before, 0) + 1) || '-' || (COALESCE(ranked.quantity_before, 0) + COALESCE(run."launchedQuantity", run.quantity, 1))
FROM ranked
WHERE run.id = ranked.id;

WITH ranked AS (
  SELECT
    id,
    "orderId",
    "orderNumber",
    COALESCE("orderYear", EXTRACT(YEAR FROM "createdAt")::INTEGER) AS batch_year,
    ROW_NUMBER() OVER (
      PARTITION BY "orderNumber", COALESCE("orderYear", EXTRACT(YEAR FROM "createdAt")::INTEGER)
      ORDER BY "createdAt", id
    ) AS batch_no
  FROM "ProductionRunRecord"
  WHERE "orderNumber" IS NOT NULL
    AND id <> '__legacy_import_completed__'
)
UPDATE "ProductionRunRecord" record
SET
  "orderYear" = ranked.batch_year,
  "orderScopeKey" = CASE
    WHEN ranked."orderId" IS NOT NULL THEN 'id:' || ranked."orderId"
    ELSE 'number:' || ranked."orderNumber" || ':' || ranked.batch_year
  END,
  "orderBatchNo" = ranked.batch_no,
  "orderBatchCode" = ranked."orderNumber" || '-' || ranked.batch_no
FROM ranked
WHERE record.id = ranked.id;
