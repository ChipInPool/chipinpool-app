import { describe, it, expect } from 'vitest';
import { generateOTP, generateInviteCode, safeEqual, hashTransactionPin, verifyTransactionPin } from '../verificationService';

describe('generateOTP', () => {
  it('always produces a 6-digit numeric code', () => {
    for (let i = 0; i < 500; i++) {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('is not trivially constant', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateOTP()));
    expect(set.size).toBeGreaterThan(1);
  });
});

describe('generateInviteCode', () => {
  it('produces the requested length from an unambiguous alphabet', () => {
    const code = generateInviteCode(10);
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/); // no 0/O/1/I
  });
});

describe('safeEqual', () => {
  it('matches equal strings and rejects different ones', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
    expect(safeEqual('abc123', 'abc124')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false); // different lengths
  });
});

describe('transaction PIN hashing', () => {
  it('hashes and verifies a PIN', async () => {
    const hash = await hashTransactionPin('1234');
    expect(hash).not.toBe('1234');
    expect(await verifyTransactionPin('1234', hash)).toBe(true);
    expect(await verifyTransactionPin('0000', hash)).toBe(false);
  });
});
