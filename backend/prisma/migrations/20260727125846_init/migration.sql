-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('RELOAD', 'LOCK', 'UNLOCK', 'REBOOT', 'RESTART_APP', 'REQUEST_SCREENSHOT', 'APPLY_PROFILE');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'ACKED', 'FAILED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingsProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "groupId" TEXT,
    "profileId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "ipAddress" TEXT,
    "currentUrlOrApp" TEXT,
    "appVersion" TEXT,
    "androidVersion" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "CommandType" NOT NULL,
    "payload" JSONB,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedAt" TIMESTAMP(3),

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeartbeatLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batteryLevel" INTEGER,
    "ipAddress" TEXT,
    "currentUrlOrApp" TEXT,

    CONSTRAINT "HeartbeatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SettingsProfile_name_key" ON "SettingsProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceTokenHash_key" ON "Device"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "Command_deviceId_status_idx" ON "Command"("deviceId", "status");

-- CreateIndex
CREATE INDEX "HeartbeatLog_deviceId_timestamp_idx" ON "HeartbeatLog"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "Screenshot_deviceId_capturedAt_idx" ON "Screenshot"("deviceId", "capturedAt");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_defaultProfileId_fkey" FOREIGN KEY ("defaultProfileId") REFERENCES "SettingsProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SettingsProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeartbeatLog" ADD CONSTRAINT "HeartbeatLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
