import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const logger = new Logger('SecretCipher');

let warned = false;

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (raw && raw.length >= 32) {
    return createHash('sha256').update(raw).digest();
  }
  if (!warned) {
    logger.warn(
      'INTEGRATION_ENCRYPTION_KEY is missing or too short — falling back to a derived dev key. Set a 32+ character secret in production.',
    );
    warned = true;
  }
  return createHash('sha256').update('senior-app-dev-fallback-key').digest();
}

/** Encrypt a UTF-8 string. Returns `iv:tag:ciphertext` base64-encoded. */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * Decrypt a value produced by encryptSecret. If the input does not look encrypted
 * (no two colons, decode failure), it is returned as-is to keep backward
 * compatibility with rows written before encryption was rolled out.
 */
export function decryptSecret(value: string): string {
  if (!value) return value;
  const parts = value.split(':');
  if (parts.length !== 3) return value;
  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    if (iv.length !== IV_LENGTH || tag.length === 0) return value;
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return value;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  try {
    return Buffer.from(parts[0], 'base64').length === IV_LENGTH;
  } catch {
    return false;
  }
}
