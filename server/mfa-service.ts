import speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, mfaRecoveryCodes, mfaLoginAttempts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const APP_NAME = "ChipInPool";

export class MFAService {
  generateSecret(): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: APP_NAME,
      issuer: APP_NAME,
      length: 20,
    });
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 1,
      });
    } catch {
      return false;
    }
  }

  async setupMFA(userId: string): Promise<{ secret: string; qrCode: string; recoveryCodes: string[] }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const secretObj = this.generateSecret();
    const secret = secretObj.base32;
    const otpauthUrl = secretObj.otpauth_url || speakeasy.otpauthURL({
      secret: secret,
      label: user.email,
      issuer: APP_NAME,
      encoding: "base32",
    });
    
    const qrCode = await this.generateQRCode(otpauthUrl);
    const recoveryCodes = await this.generateRecoveryCodes(userId);

    await db.update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.id, userId));

    return { secret, qrCode, recoveryCodes };
  }

  async enableMFA(userId: string, token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.twoFactorSecret) throw new Error("MFA not set up");

    const isValid = this.verifyToken(token, user.twoFactorSecret);
    if (!isValid) return false;

    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));

    return true;
  }

  async disableMFA(userId: string, token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.twoFactorSecret) throw new Error("MFA not enabled");

    const isValid = this.verifyToken(token, user.twoFactorSecret);
    if (!isValid) return false;

    await db.update(users)
      .set({ twoFactorEnabled: false, twoFactorSecret: null })
      .where(eq(users.id, userId));

    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));

    return true;
  }

  async verifyMFA(userId: string, token: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return true;
    }

    const isValid = this.verifyToken(token, user.twoFactorSecret);
    
    await this.logAttempt(userId, isValid, 'totp', ipAddress, userAgent);
    
    return isValid;
  }

  async generateRecoveryCodes(userId: string): Promise<string[]> {
    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      
      const codeHash = await bcrypt.hash(code, 10);
      await db.insert(mfaRecoveryCodes).values({
        userId,
        codeHash,
      });
    }

    return codes;
  }

  async useRecoveryCode(userId: string, code: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    const recoveryCodes = await db.select()
      .from(mfaRecoveryCodes)
      .where(and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.used, false)
      ));

    for (const recoveryCode of recoveryCodes) {
      const isMatch = await bcrypt.compare(code.toUpperCase(), recoveryCode.codeHash);
      if (isMatch) {
        await db.update(mfaRecoveryCodes)
          .set({ used: true, usedAt: new Date() })
          .where(eq(mfaRecoveryCodes.id, recoveryCode.id));
        
        await this.logAttempt(userId, true, 'recovery_code', ipAddress, userAgent);
        return true;
      }
    }

    await this.logAttempt(userId, false, 'recovery_code', ipAddress, userAgent);
    return false;
  }

  async logAttempt(userId: string, success: boolean, method: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(mfaLoginAttempts).values({
      userId,
      success,
      method,
      ipAddress,
      userAgent,
    });
  }

  async getMFAStatus(userId: string): Promise<{ enabled: boolean; hasRecoveryCodes: boolean; remainingCodes: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const recoveryCodes = await db.select()
      .from(mfaRecoveryCodes)
      .where(and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.used, false)
      ));

    return {
      enabled: user.twoFactorEnabled,
      hasRecoveryCodes: recoveryCodes.length > 0,
      remainingCodes: recoveryCodes.length,
    };
  }

  async getLoginAttempts(userId: string, limit: number = 10): Promise<any[]> {
    return await db.select()
      .from(mfaLoginAttempts)
      .where(eq(mfaLoginAttempts.userId, userId))
      .orderBy(mfaLoginAttempts.createdAt)
      .limit(limit);
  }

  async isMFARequired(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.twoFactorEnabled || false;
  }
}

export const mfaService = new MFAService();
