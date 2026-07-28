import { prisma } from "../db/prisma";
import type { SettingsProfile } from "@prisma/client";

/** A device's own profile override wins; otherwise it inherits its group's default profile. */
export async function resolveEffectiveProfile(deviceId: string): Promise<SettingsProfile | null> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      profile: true,
      group: { include: { defaultProfile: true } },
    },
  });

  if (!device) return null;
  return device.profile ?? device.group?.defaultProfile ?? null;
}
