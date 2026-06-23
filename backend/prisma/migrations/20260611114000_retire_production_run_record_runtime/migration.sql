-- Compatibility preflight for retiring ProductionRunRecord as a runtime source.
--
-- This migration intentionally does not drop ProductionRunRecord. The app now reads
-- and writes normalized ProductionRun/ProductionUnit/ProductionUnitOperation rows
-- for production runtime updates, while ProductionRunRecord remains a legacy JSON
-- backup. After several stable releases, run this preflight, export backups, then
-- replace the NOTICE with the DROP TABLE statement below.

DO $$
DECLARE
  normalized_count INTEGER;
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO normalized_count FROM "ProductionRun";
  SELECT COUNT(*) INTO legacy_count
  FROM "ProductionRunRecord"
  WHERE "id" <> 'PRODUCTION_RUNS_IMPORTED';

  IF legacy_count > normalized_count THEN
    RAISE NOTICE 'ProductionRunRecord still has more runtime rows (%) than normalized ProductionRun (%). Keep compatibility mode enabled.', legacy_count, normalized_count;
  ELSE
    RAISE NOTICE 'ProductionRunRecord is ready to be retained as backup only. Normalized rows: %, legacy rows: %.', normalized_count, legacy_count;
  END IF;
END $$;

-- Final removal step for a future release, after external backup and verification:
-- DROP TABLE IF EXISTS "ProductionRunRecord";
