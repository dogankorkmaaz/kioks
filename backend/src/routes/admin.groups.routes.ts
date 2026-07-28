import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { enqueueCommand } from "../services/commandQueue.service";
import { CommandType } from "@prisma/client";

export const adminGroupsRouter = Router();

adminGroupsRouter.get("/", async (_req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: { defaultProfile: true, devices: true },
      orderBy: { name: "asc" },
    });
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

const groupSchema = z.object({
  name: z.string().min(1),
  defaultProfileId: z.string().uuid().nullable().optional(),
});

adminGroupsRouter.post("/", async (req, res, next) => {
  try {
    const body = groupSchema.parse(req.body);
    const group = await prisma.group.create({ data: body });
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

adminGroupsRouter.put("/:id", async (req, res, next) => {
  try {
    const body = groupSchema.partial().parse(req.body);
    const group = await prisma.group.update({ where: { id: req.params.id }, data: body });
    res.json(group);
  } catch (err) {
    next(err);
  }
});

adminGroupsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const groupCommandSchema = z.object({
  type: z.nativeEnum(CommandType),
  payload: z.unknown().optional(),
});

// Fan-out: enqueues the same command for every device currently in the group.
adminGroupsRouter.post("/:id/commands", async (req, res, next) => {
  try {
    const { type, payload } = groupCommandSchema.parse(req.body);
    const devices = await prisma.device.findMany({
      where: { groupId: req.params.id },
      select: { id: true },
    });

    const commands = await Promise.all(
      devices.map((device) => enqueueCommand(device.id, type, payload))
    );

    res.status(201).json(commands);
  } catch (err) {
    next(err);
  }
});
