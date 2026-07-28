import { randomBytes, randomInt, createHash } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateDeviceToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const ENROLLMENT_CODE_LENGTH = 6;
// Uppercase + digits, excluding easily confused characters (0/O, 1/I/L) — meant to be
// typed on a TV remote or read aloud, not machine-generated for security depth.
const ENROLLMENT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateEnrollmentCode(): string {
  let code = "";
  for (let i = 0; i < ENROLLMENT_CODE_LENGTH; i++) {
    code += ENROLLMENT_CODE_ALPHABET[randomInt(ENROLLMENT_CODE_ALPHABET.length)];
  }
  return code;
}
