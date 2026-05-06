// AES-256-GCM bilan Telegram bot tokenini shifrlash.
// Database’da hech qachon ochiq token saqlanmaydi.

import crypto from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  return Buffer.from(env().ENCRYPTION_KEY, "hex");
}

export type EncryptedSecret = {
  encrypted: string; // base64
  iv: string;        // base64 (12 bytes)
  authTag: string;   // base64 (16 bytes)
};

export function encryptToken(plain: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: ct.toString("base64"),
    iv: iv.toString("base64"),
    authTag: tag.toString("base64"),
  };
}

export function decryptToken(s: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(s.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(s.authTag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(s.encrypted, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

// Foydalanuvchiga ko‘rsatish uchun: 1234:AA****xyz
export function maskToken(token: string): string {
  const [id, secret] = token.split(":");
  if (!secret) return "********";
  return `${id}:${secret.slice(0, 4)}****${secret.slice(-4)}`;
}
