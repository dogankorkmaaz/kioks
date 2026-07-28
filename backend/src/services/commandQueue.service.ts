import { prisma } from "../db/prisma";
import type { CommandType } from "@prisma/client";

export function enqueueCommand(deviceId: string, type: CommandType, payload?: unknown) {
  return prisma.command.create({
    data: { deviceId, type, payload: payload as never },
  });
}

export function listPendingCommands(deviceId: string) {
  return prisma.command.findMany({
    where: { deviceId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

export function ackCommand(commandId: string, status: "ACKED" | "FAILED", result?: unknown) {
  return prisma.command.update({
    where: { id: commandId },
    data: { status, result: result as never, ackedAt: new Date() },
  });
}
