import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { env } from "./env";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

export async function hashSecret(raw: string) {
  return hash(raw, { timeCost: 3, memoryCost: 65536, parallelism: 1, algorithm: 2 });
}

export async function verifySecret(hashValue: string, raw: string) {
  return verify(hashValue, raw);
}

export function generateRecoveryKey() {
  const groups: string[] = [];

  for (let i = 0; i < 6; i += 1) {
    let group = "";
    for (let j = 0; j < 4; j += 1) {
      group += RECOVERY_ALPHABET[Math.floor(Math.random() * RECOVERY_ALPHABET.length)];
    }
    groups.push(group);
  }

  return groups.join("-");
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(encrypted: string) {
  const [ivHex, authTagHex, cipherTextHex] = encrypted.split(":");

  if (!ivHex || !authTagHex || !cipherTextHex) {
    throw new Error("Invalid encrypted payload");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
