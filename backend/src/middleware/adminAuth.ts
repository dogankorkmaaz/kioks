import type { NextFunction, Request, Response } from "express";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminEmail?: string;
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
