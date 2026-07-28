import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { enqueueCommand } from "../services/commandQueue.service";
import { isDeviceOnline } from "../services/deviceStatus.service";
import { assignEnrollmentCode } from "../services/enrollment.service";
import { CommandType } from "@prisma/client";

export const adminDevicesRouter = Router();

function serializeDevice<T extends { lastSeenAt: Date | null; deviceTokenHash?: string | null }>(device: T) {
  const { deviceTokenHash: _deviceTokenHash, ...rest } = device;
  return { ...rest, isOnline: isDeviceOnline(device.lastSeenAt) };
}

adminDevicesRouter.get("/", async (_req, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      include: { group: true, profile: true },
      orderBy: { name: "asc" },
    });
    res.json(devices.map(serializeDevice));
  } catch (err) {
    next(err);
  }
});

const createDeviceSchema = z.object({
  name: z.string().min(1),
  groupId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
});

// The device isn't given a long-lived token here — it starts unenrolled with a short
// enrollment code instead (see assignEnrollmentCode), which the device exchanges for
// its real token via POST /api/enroll. Much friendlier to type on a TV remote than a
// 64-char token + UUID.
adminDevicesRouter.post("/", async (req, res, next) => {
  try {
    const body = createDeviceSchema.parse(req.body);
    const device = await prisma.device.create({ data: body });
    const withCode = await assignEnrollmentCode(device.id);
    res.status(201).json(serializeDevice(withCode));
  } catch (err) {
    next(err);
  }
});

// Re-generates a fresh enrollment code (e.g. the previous one expired, or the device
// was factory-reset and needs to re-enroll). Does not invalidate an already-issued token.
adminDevicesRouter.post("/:id/enrollment-code", async (req, res, next) => {
  try {
    const device = await assignEnrollmentCode(req.params.id);
    res.json(serializeDevice(device));
  } catch (err) {
    next(err);
  }
});

const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  groupId: z.string().uuid().nullable().optional(),
  profileId: z.string().uuid().nullable().optional(),
});

adminDevicesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = updateDeviceSchema.parse(req.body);
    const device = await prisma.device.update({ where: { id: req.params.id }, data: body });
    res.json(serializeDevice(device));
  } catch (err) {
    next(err);
  }
});

adminDevicesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.device.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const commandSchema = z.object({
  type: z.nativeEnum(CommandType),
  payload: z.unknown().optional(),
});

adminDevicesRouter.post("/:id/commands", async (req, res, next) => {
  try {
    const { type, payload } = commandSchema.parse(req.body);
    const command = await enqueueCommand(req.params.id, type, payload);
    res.status(201).json(command);
  } catch (err) {
    next(err);
  }
});

adminDevicesRouter.get("/:id/heartbeats", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const logs = await prisma.heartbeatLog.findMany({
      where: { deviceId: req.params.id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

adminDevicesRouter.get("/:id/screenshots/latest", async (req, res, next) => {
  try {
    const screenshot = await prisma.screenshot.findFirst({
      where: { deviceId: req.params.id },
      orderBy: { capturedAt: "desc" },
    });
    if (!screenshot) {
      res.status(404).json({ error: "No screenshots yet for this device" });
      return;
    }
    res.json(screenshot);
  } catch (err) {
    next(err);
  }
});
