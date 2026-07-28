import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { generateDeviceToken, hashDeviceToken } from "../services/deviceToken.service";

export const enrollRouter = Router();

const enrollSchema = z.object({
  code: z.string().min(1),
});

// Public (no device auth yet — the device doesn't have a token until this succeeds).
// Exchanges a short-lived admin-issued enrollment code for a real device token.
enrollRouter.post("/", async (req, res, next) => {
  try {
    const { code } = enrollSchema.parse(req.body);
    const normalizedCode = code.trim().toUpperCase();

    const device = await prisma.device.findUnique({ where: { enrollmentCode: normalizedCode } });

    if (!device || !device.enrollmentCodeExpiresAt || device.enrollmentCodeExpiresAt < new Date()) {
      res.status(404).json({ error: "Invalid or expired enrollment code" });
      return;
    }

    const token = generateDeviceToken();
    await prisma.device.update({
      where: { id: device.id },
      data: {
        deviceTokenHash: hashDeviceToken(token),
        enrollmentCode: null,
        enrollmentCodeExpiresAt: null,
      },
    });

    res.json({ deviceId: device.id, deviceToken: token });
  } catch (err) {
    next(err);
  }
});
