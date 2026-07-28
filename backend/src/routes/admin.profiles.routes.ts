import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { settingsProfileConfigSchema } from "../schemas/settingsProfile.schema";

export const adminProfilesRouter = Router();

adminProfilesRouter.get("/", async (_req, res, next) => {
  try {
    const profiles = await prisma.settingsProfile.findMany({ orderBy: { name: "asc" } });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

const createProfileSchema = z.object({
  name: z.string().min(1),
  config: settingsProfileConfigSchema,
});

adminProfilesRouter.post("/", async (req, res, next) => {
  try {
    const body = createProfileSchema.parse(req.body);
    const profile = await prisma.settingsProfile.create({
      data: { name: body.name, configJson: body.config },
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  config: settingsProfileConfigSchema.optional(),
});

// Any config edit bumps `version` so devices can detect their cached profile is stale.
adminProfilesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const existing = await prisma.settingsProfile.findUniqueOrThrow({ where: { id: req.params.id } });

    const profile = await prisma.settingsProfile.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        configJson: body.config,
        version: body.config ? existing.version + 1 : existing.version,
      },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

adminProfilesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.settingsProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
