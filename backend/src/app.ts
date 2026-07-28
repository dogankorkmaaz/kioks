import express from "express";
import session from "express-session";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config";
import { authRouter } from "./routes/auth.routes";
import { adminRouter } from "./routes/admin.routes";
import { deviceRouter } from "./routes/device.routes";
import { enrollRouter } from "./routes/enroll.routes";
import { errorHandler } from "./middleware/errorHandler";

const dashboardDist = path.resolve(__dirname, "../../dashboard/dist");

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms) [${req.ip}]`);
    });
    next();
  });
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12 },
    })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/devices", deviceRouter);
  app.use("/api/enroll", enrollRouter);

  if (fs.existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));
    // SPA fallback: any non-API, non-file route serves index.html so React Router can handle it client-side.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dashboardDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
