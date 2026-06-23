CREATE TABLE "NomenclatureProcessRecord" (
  "id" TEXT NOT NULL,
  "equipment" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "operationsCount" INTEGER NOT NULL DEFAULT 0,
  "totalNormHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" TEXT NOT NULL DEFAULT 'manual',
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NomenclatureProcessRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NomenclatureProcessRecord_productCode_idx" ON "NomenclatureProcessRecord"("productCode");
CREATE INDEX "NomenclatureProcessRecord_category_idx" ON "NomenclatureProcessRecord"("category");
