ALTER TABLE "AppUser"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "workCenterSection" TEXT,
  ADD COLUMN "isTerminalOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);
