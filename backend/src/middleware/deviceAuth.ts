import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { hashDeviceToken } from "../services/deviceToken.service";
import type { Device } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      device?: Device;
    }
  }
}

export async function deviceAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing device bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  const device = await prisma.device.findUnique({
    where: { deviceTokenHash: hashDeviceToken(token) },
  });

  if (!device) {
    res.status(401).json({ error: "Invalid device token" });
    return;
  }

  if (device.id !== req.params.id) {
    res.status(403).json({ error: "Token does not match requested device" });
    return;
  }

  req.device = device;
  next();
}
