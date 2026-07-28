import { prisma } from "../db/prisma";
import { generateEnrollmentCode } from "./deviceToken.service";

const ENROLLMENT_CODE_TTL_MS = 15 * 60 * 1000;

/** Generates a fresh 6-character enrollment code for a device, retrying on the rare unique-constraint collision. */
export async function assignEnrollmentCode(deviceId: string) {
  const expiresAt = new Date(Date.now() + ENROLLMENT_CODE_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.device.update({
        where: { id: deviceId },
        data: { enrollmentCode: generateEnrollmentCode(), enrollmentCodeExpiresAt: expiresAt },
      });
    } catch (err) {
      const isUniqueClash = err instanceof Object && "code" in err && err.code === "P2002";
      if (!isUniqueClash || attempt === 4) throw err;
    }
  }
  throw new Error("Failed to generate a unique enrollment code");
}
