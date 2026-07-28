import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { config } from "../config";

/**
 * Transparent proxy onto the standalone tv-kiosk digital-signage app (its own
 * Express server on the Pi, see /home/dk/tv/server.js — kept completely untouched
 * and still independently reachable at :3003). Mounted under the admin router so
 * managing signage requires the same dashboard login as everything else, which the
 * standalone app's own API doesn't enforce on its own.
 *
 * No pathRewrite: Express already strips the "/api/admin/signage" mount prefix
 * before this middleware sees the request, so e.g. a dashboard call to
 * /api/admin/signage/api/media arrives here as /api/media and forwards to the
 * origin app's /api/media unchanged — same for its /uploads/<file> static paths.
 *
 * `fixRequestBody` re-serializes req.body for the JSON-bodied requests (/api/play,
 * /api/settings) since express.json() upstream already parsed and consumed the
 * original stream; multipart uploads (/api/upload) aren't touched by express.json()
 * (wrong content-type) so their raw stream passes through unmodified either way.
 */
export const signageRouter = Router();

signageRouter.use(
  createProxyMiddleware({
    target: config.signageUrl,
    changeOrigin: true,
    on: { proxyReq: fixRequestBody },
  }),
);
