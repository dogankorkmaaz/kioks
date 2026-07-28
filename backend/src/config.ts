import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  sessionSecret: required("SESSION_SECRET"),
  screenshotsDir: path.resolve(process.env.SCREENSHOTS_DIR ?? "./uploads/screenshots"),
  // The standalone digital-signage app (tv-kiosk, see /home/dk/tv on the Pi) — proxied
  // rather than merged so its own working code/data is never touched by this repo.
  signageUrl: process.env.SIGNAGE_URL ?? "http://localhost:3003",
};
