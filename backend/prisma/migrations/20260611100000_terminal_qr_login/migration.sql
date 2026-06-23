ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "terminalQrToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_terminalQrToken_key" ON "AppUser"("terminalQrToken");
