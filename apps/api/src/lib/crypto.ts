/**
 * Secret encryption utilities — AES-256-GCM with authenticated encryption.
 *
 * Key derivation: SHA-256 hash of the raw key string → always 32 bytes.
 *   Accepts any-length env var; users should supply a strong random string.
 *
 * Storage format: "hexIV:hexAuthTag:hexCiphertext" stored inside a JSON object:
 *   { _enc: "<iv>:<tag>:<ciphertext>" }
 *
 * Backward compatibility: if secretData has no _enc key (legacy unencrypted record)
 *   decryptSecretData returns the object as-is and logs a warning.
 *
 * IMPORTANT: never log rawKey, derived keys, plaintext, or decrypted values.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit IV — recommended for GCM

/** Derives a fixed 32-byte AES key from any-length string via SHA-256. */
function deriveKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey, 'utf8').digest()
}

/**
 * Encrypts a plaintext string.
 * Returns "hexIV:hexAuthTag:hexCiphertext".
 */
export function encryptString(plaintext: string, rawKey: string): string {
  const key = deriveKey(rawKey)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a ciphertext produced by encryptString.
 * Throws if the GCM authentication tag verification fails (tampered data).
 */
export function decryptString(ciphertext: string, rawKey: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format — expected iv:tag:ciphertext')
  const [ivHex, tagHex, dataHex] = parts
  const key = deriveKey(rawKey)
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

/**
 * Encrypts a plain-object secret map.
 * Returns { _enc: "..." } — safe to store in a Prisma Json column.
 */
export function encryptSecretData(
  data: Record<string, unknown>,
  rawKey: string,
): { _enc: string } {
  return { _enc: encryptString(JSON.stringify(data), rawKey) }
}

/**
 * Decrypts secretData stored in a BotSecret row.
 *
 * If secretData contains an `_enc` key, decrypts and parses it.
 * If not (legacy unencrypted record), returns the object as-is — these rows
 * should be migrated with the migrate-secrets script.
 */
export function decryptSecretData(
  secretData: Record<string, unknown>,
  rawKey: string,
): Record<string, unknown> {
  if (typeof secretData._enc === 'string') {
    return JSON.parse(decryptString(secretData._enc, rawKey)) as Record<string, unknown>
  }
  // Legacy unencrypted record — return as-is (run migrate-secrets to encrypt)
  return secretData
}
