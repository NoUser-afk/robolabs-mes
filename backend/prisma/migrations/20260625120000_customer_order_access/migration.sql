CREATE TABLE IF NOT EXISTS "CustomerOrderAccess" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "accessCodeHash" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  CONSTRAINT "CustomerOrderAccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CustomerOrderAccess_orderId_disabledAt_idx" ON "CustomerOrderAccess"("orderId", "disabledAt");
CREATE INDEX IF NOT EXISTS "CustomerOrderAccess_createdAt_idx" ON "CustomerOrderAccess"("createdAt");
