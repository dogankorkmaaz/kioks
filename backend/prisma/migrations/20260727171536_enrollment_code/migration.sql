-- AlterTable: deviceTokenHash becomes optional (a device may exist unenrolled,
-- with only an enrollment code, until it exchanges the code for a real token),
-- and add the enrollment code columns.
ALTER TABLE "Device" ALTER COLUMN "deviceTokenHash" DROP NOT NULL;
ALTER TABLE "Device" ADD COLUMN "enrollmentCode" TEXT;
ALTER TABLE "Device" ADD COLUMN "enrollmentCodeExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Device_enrollmentCode_key" ON "Device"("enrollmentCode");
