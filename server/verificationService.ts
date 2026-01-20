import { generateSecret as genSecret } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generate2FASecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = genSecret();
  const otpauthUrl = `otpauth://totp/ChipInPay:${encodeURIComponent(email)}?secret=${secret}&issuer=ChipInPay`;
  return { secret, otpauthUrl };
}

export async function generate2FAQRCode(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl);
}

export function verify2FAToken(secret: string, token: string): boolean {
  const counter = Math.floor(Date.now() / 30000);
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTP(secret, counter + i);
    if (expectedToken === token) return true;
  }
  return false;
}

function generateTOTP(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', Buffer.from(base32Decode(secret)));
  hmac.update(buffer);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of input.toUpperCase()) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export async function hashTransactionPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

export async function verifyTransactionPin(pin: string, hashedPin: string): Promise<boolean> {
  return await bcrypt.compare(pin, hashedPin);
}
