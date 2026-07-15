import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptField, decryptField, isEncrypted, isEncryptionEnabled } from '../encryption';

const KEY = 'a'.repeat(64); // 32 bytes hex

describe('encryption (no key configured)', () => {
  beforeEach(() => { delete process.env.ENCRYPTION_KEY; });

  it('is a no-op passthrough when no key is set', () => {
    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptField('4111111111111111')).toBe('4111111111111111');
  });

  it('returns legacy plaintext unchanged on decrypt', () => {
    expect(decryptField('021000021')).toBe('021000021');
  });

  it('passes through null/empty', () => {
    expect(encryptField(null)).toBe(null);
    expect(encryptField('')).toBe('');
    expect(decryptField(undefined)).toBe(undefined);
  });
});

describe('encryption (key configured)', () => {
  beforeEach(() => { process.env.ENCRYPTION_KEY = KEY; });
  afterEach(() => { delete process.env.ENCRYPTION_KEY; });

  it('round-trips a value', () => {
    const secret = '021000021';
    const enc = encryptField(secret) as string;
    expect(enc).not.toBe(secret);
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptField(enc)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptField('same-value');
    const b = encryptField('same-value');
    expect(a).not.toBe(b);
    expect(decryptField(a as string)).toBe('same-value');
    expect(decryptField(b as string)).toBe('same-value');
  });

  it('does not double-encrypt an already-encrypted value', () => {
    const enc = encryptField('hello') as string;
    expect(encryptField(enc)).toBe(enc);
  });

  it('still reads legacy plaintext (backward compatible)', () => {
    expect(decryptField('legacy-plaintext')).toBe('legacy-plaintext');
  });
});
