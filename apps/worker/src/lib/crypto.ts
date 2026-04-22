/**
 * Secret encryption utilities — AES-256-GCM with authenticated encryption.
 * (Mirror of apps/api/src/lib/crypto.ts — both apps must use the same algorithm.)
 *
 * IMPORTANT: never log rawKey, derived keys, plaintext, or decrypted values.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

function deriveKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey, 'utf8').digest()
}

export function encryptString(plaintext: string, rawKey: string): string {
  const key = deriveKey(rawKey)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

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

export function encryptSecretData(
  data: Record<string, unknown>,
  rawKey: string,
): { _enc: string } {
  return { _enc: encryptString(JSON.stringify(data), rawKey) }
}

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
