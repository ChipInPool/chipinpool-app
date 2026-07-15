import crypto from 'crypto';

// Field-level encryption for sensitive at-rest data (bank account/routing
// numbers, Plaid access tokens). Uses AES-256-GCM with a random IV per value.
//
// Backward/forward compatible and safe to deploy incrementally:
//   - If ENCRYPTION_KEY is not set, encryptField() is a passthrough (no-op) so
//     behavior is identical to before this module existed.
//   - decryptField() only decrypts values in the "enc:v1:" envelope; any legacy
//     plaintext value is returned unchanged. This lets you deploy the code,
//     then migrate existing rows, without a flag-day.
//
// ENCRYPTION_KEY must be 32 bytes, provided as a 64-char hex string or base64.

const ENVELOPE_PREFIX = 'enc:v1:';

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes (256 bits)');
  }
  return key;
}

export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENVELOPE_PREFIX);
}

// Encrypt a value. Returns the value unchanged if no key is configured or the
// input is empty/already encrypted, so callers can wrap writes unconditionally.
export function encryptField(plaintext: string | null | undefined): string | null | undefined {
  if (plaintext == null || plaintext === '') return plaintext;
  const key = getKey();
  if (!key) return plaintext; // no-op until a key is configured
  if (isEncrypted(plaintext)) return plaintext;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // envelope: enc:v1:<iv>.<tag>.<ciphertext> (all base64)
  return `${ENVELOPE_PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

// Decrypt a value. Legacy plaintext (not in the envelope) is returned as-is.
export function decryptField(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return value;
  if (!isEncrypted(value)) return value; // legacy plaintext
  const key = getKey();
  if (!key) {
    // Encrypted data present but no key configured — cannot recover.
    throw new Error('Encrypted value encountered but ENCRYPTION_KEY is not set');
  }
  const body = value.slice(ENVELOPE_PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
