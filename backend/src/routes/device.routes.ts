import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { deviceAuth } from "../middleware/deviceAuth";
import { resolveEffectiveProfile } from "../services/profile.service";
import { listPendingCommands, ackCommand } from "../services/commandQueue.service";
import { config } from "../config";

export const deviceRouter = Router({ mergeParams: true });

const heartbeatSchema = z.object({
  batteryLevel: z.number().int().min(0).max(100).optional(),
  ipAddress: z.string().optional(),
  currentUrlOrApp: z.string().optional(),
  appVersion: z.string().optional(),
  androidVersion: z.string().optional(),
  model: z.string().optional(),
});

// All routes below are scoped to /api/devices/:id and require the device's own bearer token.
deviceRouter.post("/:id/heartbeat", deviceAuth, async (req, res, next) => {
  try {
    const body = heartbeatSchema.parse(req.body);
    const deviceId = req.params.id;

    await prisma.$transaction([
      prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date(), ...body },
      }),
      prisma.heartbeatLog.create({
        data: {
          deviceId,
          batteryLevel: body.batteryLevel,
          ipAddress: body.ipAddress,
          currentUrlOrApp: body.currentUrlOrApp,
        },
      }),
    ]);

    const profile = await resolveEffectiveProfile(deviceId);
    const deviceRecord = await prisma.device.findUniqueOrThrow({ where: { id: deviceId } });

    res.json({
      profileVersion: profile?.version ?? null,
      hasNewProfile: profile !== null && profile.id !== deviceRecord.profileId,
    });
  } catch (err) {
    next(err);
  }
});

deviceRouter.get("/:id/profile", deviceAuth, async (req, res, next) => {
  try {
    const profile = await resolveEffectiveProfile(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "No profile assigned to this device" });
      return;
    }
    res.json({ id: profile.id, version: profile.version, config: profile.configJson });
  } catch (err) {
    next(err);
  }
});

deviceRouter.get("/:id/commands/pending", deviceAuth, async (req, res, next) => {
  try {
    const commands = await listPendingCommands(req.params.id);
    res.json(commands);
  } catch (err) {
    next(err);
  }
});

const ackSchema = z.object({
  status: z.enum(["ACKED", "FAILED"]),
  result: z.unknown().optional(),
});

deviceRouter.post("/:id/commands/:commandId/ack", deviceAuth, async (req, res, next) => {
  try {
    const { status, result } = ackSchema.parse(req.body);
    const command = await prisma.command.findUnique({ where: { id: req.params.commandId } });

    if (!command || command.deviceId !== req.params.id) {
      res.status(404).json({ error: "Command not found for this device" });
      return;
    }

    const updated = await ackCommand(req.params.commandId, status, result);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: config.screenshotsDir,
    filename: (req, _file, cb) => cb(null, `${req.params.id}-${Date.now()}.jpg`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

deviceRouter.post("/:id/screenshot", deviceAuth, upload.single("screenshot"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing screenshot file" });
      return;
    }

    const screenshot = await prisma.screenshot.create({
      data: {
        deviceId: req.params.id,
        filePath: path.relative(config.screenshotsDir, req.file.path),
      },
    });

    res.status(201).json(screenshot);
  } catch (err) {
    next(err);
  }
});
