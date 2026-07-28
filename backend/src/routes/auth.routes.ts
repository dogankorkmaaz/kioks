import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../db/prisma";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !(await argon2.verify(admin.passwordHash, password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    res.json({ id: admin.id, email: admin.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.status(204).send();
  });
});

authRouter.get("/me", (req, res) => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: req.session.adminId, email: req.session.adminEmail });
});
