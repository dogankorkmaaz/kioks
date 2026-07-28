import { z } from "zod";

// Mirrors docs/settings-profile-schema.json — keep both in sync.
export const settingsProfileConfigSchema = z.object({
  mode: z.enum(["web", "native_app"]),
  url: z.string().optional(),
  urlWhitelist: z.array(z.string()).optional(),
  urlBlacklist: z.array(z.string()).optional(),
  javascriptEnabled: z.boolean().default(true),
  popupsBlocked: z.boolean().default(true),
  zoomEnabled: z.boolean().default(false),
  autoplayEnabled: z.boolean().default(true),
  userAgent: z.string().nullable().optional(),
  cookiesEnabled: z.boolean().default(true),
  nativeAppPackage: z.string().nullable().optional(),
  sleepTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  wakeTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  idleTimeoutMinutes: z.number().int().min(1).nullable().optional(),
  screensaver: z
    .object({
      type: z.enum(["image", "clock", "url"]),
      imageUrl: z.string().optional(),
      url: z.string().optional(),
    })
    .nullable()
    .optional(),
  motionDetectionMode: z.enum(["off", "accelerometer", "camera"]).default("accelerometer"),
  screenshotIntervalMinutes: z.number().int().min(1).nullable().optional(),
  pinHash: z.string().nullable().optional(),
});

export type SettingsProfileConfig = z.infer<typeof settingsProfileConfigSchema>;
