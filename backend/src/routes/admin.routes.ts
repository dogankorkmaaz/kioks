import { Router, static as expressStatic } from "express";
import { adminAuth } from "../middleware/adminAuth";
import { adminDevicesRouter } from "./admin.devices.routes";
import { adminGroupsRouter } from "./admin.groups.routes";
import { adminProfilesRouter } from "./admin.profiles.routes";
import { signageRouter } from "./signage.routes";
import { config } from "../config";

export const adminRouter = Router();

adminRouter.use(adminAuth);
adminRouter.use("/devices", adminDevicesRouter);
adminRouter.use("/groups", adminGroupsRouter);
adminRouter.use("/profiles", adminProfilesRouter);
adminRouter.use("/signage", signageRouter);
// Mounted after adminAuth above, so screenshot files require an authenticated admin session too.
adminRouter.use("/screenshot-files", expressStatic(config.screenshotsDir));
