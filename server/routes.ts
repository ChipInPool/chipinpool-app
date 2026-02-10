import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { fileStorageService, isAzureStorage } from "./fileStorage";
import { registerSchema, loginSchema, loginWithUsernameSchema, phoneLoginSchema, verifyPhoneLoginSchema, forgotPasswordSchema, resetPasswordSchema, insertPoolSchema, insertContributionSchema, insertCommentSchema, insertTransactionSchema, users, follows, contributions, phoneVerificationCodes, passwordResetTokens, sendPhoneCodeSchema, verifyPhoneCodeSchema, adminAuditLogs, pools, transactions, merchants, virtualCards, fraudAlerts, walletWithdrawals, walletDeposits, bankAccounts, merchantPayouts, payMeTransactions, apiAccessRequests, poolActivities } from "@shared/schema";
import express from "express";
import { db } from "./db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendPoolInviteEmail } from "./resendClient";
import { sendPoolInviteSMS } from "./clicksendClient";
import { awardContributionPoints, awardPoolCreationPoints, awardPoolCompletionPoints } from "./gamification";
import { 
  generateOTP, 
  generate2FASecret, 
  generate2FAQRCode, 
  verify2FAToken,
  hashTransactionPin,
  verifyTransactionPin
} from "./verificationService";
import {
  sendPoolContributionNotification,
  sendPoolCompletedNotification,
  sendPoolInviteNotification,
  sendVerificationEmail,
  sendVerificationSMS,
  sendPasswordResetEmail,
  sendPasswordResetSMS,
  sendWelcomeEmail,
  sendSecurityAlertNotification,
  sendKycStatusNotification,
  sendCardActivityNotification,
  sendWalletActivityNotification,
  sendAccountChangeNotification
} from "./notificationService";
import { getMercuryClient, hasMercuryCredentials } from "./mercuryClient";
import { createPlaidPayout, hasPlaidCredentials, TransferSpeed } from "./plaidTransferClient";
import { sendPushNotification, getVapidPublicKey, savePushSubscription, removePushSubscription } from "./pushService";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    pendingMfaUserId?: string;
  }
}

// Helper to get client IP address from request (handles proxies like Azure)
function getClientIp(req: express.Request): string {
  // Check x-forwarded-for header (common for proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    const firstIp = ips[0]?.trim();
    if (firstIp && isValidIpAddress(firstIp)) {
      return firstIp;
    }
  }
  
  // Check x-real-ip header
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && isValidIpAddress(realIp)) {
    return realIp;
  }
  
  // Fall back to req.ip or socket address
  const ip = req.ip || req.socket?.remoteAddress;
  if (ip && isValidIpAddress(ip)) {
    return ip;
  }
  
  // Default fallback - use a valid IPv4 address
  return '127.0.0.1';
}

function isValidIpAddress(ip: string): boolean {
  // Remove IPv6 prefix if present (::ffff:)
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(cleanIp)) {
    return true;
  }
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  if (ipv6Regex.test(ip) && ip.includes(':')) {
    return true;
  }
  
  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Security: Validate SESSION_SECRET is set in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    console.warn('[Security Warning] SESSION_SECRET not set - using insecure default for development only');
  }
  
  // Rate limiting for authentication endpoints (prevent brute force attacks)
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

  // More permissive rate limiter for less sensitive operations
  const generalRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiting to all API routes
  app.use('/api/', generalRateLimiter);

  // Session middleware
  app.use(
    session({
      secret: sessionSecret || 'dev-only-insecure-secret-do-not-use-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      },
      proxy: true, // Trust the reverse proxy
    })
  );
  
  // Trust proxy for secure cookies behind Replit's proxy
  app.set('trust proxy', 1);

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Admin middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.adminUser = user;
    next();
  };

  // Phone verification routes - rate limited to prevent abuse
  app.post("/api/auth/send-phone-code", authRateLimiter, async (req, res, next) => {
    try {
      const { phone } = sendPhoneCodeSchema.parse(req.body);
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Delete any existing codes for this phone
      await db.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phone, phone));
      
      // Save new code
      await db.insert(phoneVerificationCodes).values({
        phone,
        code,
        expiresAt,
      });
      
      // Send SMS via ClickSend
      try {
        await sendVerificationSMS(phone, code);
      } catch (smsError) {
        console.error('[SMS] Failed to send verification code:', smsError);
        return res.status(500).json({ message: "Failed to send verification code. Please try again." });
      }
      
      res.json({ message: "Verification code sent" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/verify-phone-code", authRateLimiter, async (req, res, next) => {
    try {
      const { phone, code } = verifyPhoneCodeSchema.parse(req.body);
      
      const [verification] = await db.select()
        .from(phoneVerificationCodes)
        .where(eq(phoneVerificationCodes.phone, phone))
        .limit(1);
      
      if (!verification) {
        return res.status(400).json({ message: "No verification code found. Please request a new code." });
      }
      
      if (verification.code !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      if (new Date() > verification.expiresAt) {
        return res.status(400).json({ message: "Verification code expired. Please request a new code." });
      }
      
      // Mark as verified
      await db.update(phoneVerificationCodes)
        .set({ verified: true })
        .where(eq(phoneVerificationCodes.id, verification.id));
      
      res.json({ message: "Phone verified successfully", verified: true });
    } catch (error) {
      next(error);
    }
  });

  // Check if username is available
  app.post("/api/auth/check-username", async (req, res, next) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ available: false, message: "Username is required" });
      }
      
      const existing = await storage.getUserByUsername(username.toLowerCase());
      res.json({ 
        available: !existing,
        message: existing ? "Username is already taken" : "Username is available"
      });
    } catch (error) {
      next(error);
    }
  });

  // Check if email is available
  app.post("/api/auth/check-email", async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ available: false, message: "Email is required" });
      }
      
      const existing = await storage.getUserByEmail(email.toLowerCase());
      res.json({ 
        available: !existing,
        message: existing ? "This email is already registered. Would you like to sign in instead?" : "Email is available",
        exists: !!existing
      });
    } catch (error) {
      next(error);
    }
  });

  // Check if phone is available
  app.post("/api/auth/check-phone", async (req, res, next) => {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ available: false, message: "Phone is required" });
      }
      
      const existing = await storage.getUserByPhone(phone);
      res.json({ 
        available: !existing,
        message: existing ? "This phone number is already registered. Would you like to sign in instead?" : "Phone is available",
        exists: !!existing
      });
    } catch (error) {
      next(error);
    }
  });

  // Auth routes - rate limited to prevent brute force attacks
  app.post("/api/auth/register", authRateLimiter, async (req, res, next) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Verify phone code was validated
      const [phoneVerification] = await db.select()
        .from(phoneVerificationCodes)
        .where(eq(phoneVerificationCodes.phone, data.phone))
        .limit(1);
      
      if (!phoneVerification || !phoneVerification.verified || phoneVerification.code !== data.phoneVerificationCode) {
        return res.status(400).json({ message: "Phone verification required" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const now = new Date();
      const user = await storage.createUser({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        phone: data.phone,
        dateOfBirth: new Date(data.dateOfBirth),
        password: hashedPassword,
        authProvider: 'email',
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      });
      
      // Mark phone as verified
      await db.update(users).set({ phoneVerified: true }).where(eq(users.id, user.id));
      
      // Clean up verification code
      await db.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phone, data.phone));

      req.session.userId = user.id;
      
      // Explicitly save session before responding to ensure cookie is set
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Send welcome email asynchronously
      sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`).catch(err => 
        console.error('[Notification] Welcome email failed:', err)
      );

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user has a password (social login users won't have one)
      if (!user.password) {
        return res.status(401).json({ message: "Please sign in with Google or Apple" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if MFA is enabled
      if (user.twoFactorEnabled) {
        // Store user ID in session temporarily for MFA verification
        req.session.pendingMfaUserId = user.id;
        return res.json({ mfaRequired: true, userId: user.id });
      }

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Login with username and password
  app.post("/api/auth/login-username", authRateLimiter, async (req, res, next) => {
    try {
      const data = loginWithUsernameSchema.parse(req.body);
      const username = data.username.toLowerCase().replace(/^@/, '');
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Please sign in with Google or Apple" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if MFA is enabled
      if (user.twoFactorEnabled) {
        req.session.pendingMfaUserId = user.id;
        return res.json({ mfaRequired: true, userId: user.id });
      }

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Verify MFA code during login
  app.post("/api/auth/verify-mfa", authRateLimiter, async (req, res, next) => {
    try {
      const { userId, code, useRecoveryCode } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ message: "Missing userId or code" });
      }

      // Verify the pending MFA session
      if (req.session.pendingMfaUserId !== userId) {
        return res.status(401).json({ message: "Invalid MFA session" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let isValid = false;
      const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
      const userAgent = req.headers['user-agent'];

      if (useRecoveryCode) {
        isValid = await mfaService.useRecoveryCode(userId, code, ipAddress, userAgent);
      } else {
        isValid = await mfaService.verifyMFA(userId, code, ipAddress, userAgent);
      }

      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Complete the login
      req.session.userId = userId;
      delete req.session.pendingMfaUserId;
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Send OTP for phone login
  app.post("/api/auth/phone-login/send", authRateLimiter, async (req, res, next) => {
    try {
      const data = phoneLoginSchema.parse(req.body);
      
      // Check if user exists with this phone
      const user = await storage.getUserByPhone(data.phone);
      if (!user) {
        return res.status(404).json({ message: "No account found with this phone number" });
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

      await db.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phone, data.phone));
      await db.insert(phoneVerificationCodes).values({
        phone: data.phone,
        code,
        expiresAt,
      });

      await sendVerificationSMS(data.phone, code);
      res.json({ message: "Login code sent to your phone" });
    } catch (error) {
      next(error);
    }
  });

  // Verify OTP and login
  app.post("/api/auth/phone-login/verify", authRateLimiter, async (req, res, next) => {
    try {
      const data = verifyPhoneLoginSchema.parse(req.body);
      
      const [verification] = await db.select()
        .from(phoneVerificationCodes)
        .where(eq(phoneVerificationCodes.phone, data.phone))
        .orderBy(desc(phoneVerificationCodes.createdAt))
        .limit(1);

      if (!verification) {
        return res.status(400).json({ message: "No verification code found. Please request a new code." });
      }

      if (verification.code !== data.code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date() > verification.expiresAt) {
        return res.status(400).json({ message: "Code expired. Please request a new code." });
      }

      const user = await storage.getUserByPhone(data.phone);
      if (!user) {
        return res.status(404).json({ message: "No account found with this phone number" });
      }

      // Check if MFA is enabled - phone OTP counts as first factor, still need TOTP
      if (user.twoFactorEnabled) {
        req.session.pendingMfaUserId = user.id;
        return res.json({ mfaRequired: true, userId: user.id });
      }

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Forgot password - send reset link
  app.post("/api/auth/forgot-password", authRateLimiter, async (req, res, next) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      
      let user;
      if (data.method === 'email' && data.email) {
        user = await storage.getUserByEmail(data.email);
      } else if (data.method === 'phone' && data.phone) {
        user = await storage.getUserByPhone(data.phone);
      }

      if (!user) {
        // Don't reveal if account exists
        return res.json({ message: "If an account exists, you will receive a reset link" });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send reset link via chosen method
      const resetLink = `${process.env.NODE_ENV === 'production' ? 'https://' + req.get('host') : 'http://localhost:5000'}/reset-password?token=${token}`;
      
      if (data.method === 'email' && user.email) {
        await sendPasswordResetEmail(user.email, resetLink);
      } else if (data.method === 'phone' && user.phone) {
        await sendPasswordResetSMS(user.phone, resetLink);
      }

      res.json({ message: "If an account exists, you will receive a reset link" });
    } catch (error) {
      next(error);
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", authRateLimiter, async (req, res, next) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      
      // Use transaction to atomically mark as used and update password
      await db.transaction(async (tx) => {
        const [resetToken] = await tx.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, data.token))
          .limit(1);

        if (!resetToken) {
          throw new Error("Invalid or expired reset token");
        }

        if (resetToken.used) {
          throw new Error("This reset link has already been used");
        }

        if (new Date() > resetToken.expiresAt) {
          throw new Error("Reset link has expired. Please request a new one.");
        }

        // Mark token as used FIRST to prevent race conditions
        await tx.update(passwordResetTokens)
          .set({ used: true })
          .where(eq(passwordResetTokens.id, resetToken.id));

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        await tx.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, resetToken.userId));
        
        // Get user for notification
        const [updatedUser] = await tx.select().from(users).where(eq(users.id, resetToken.userId)).limit(1);
        if (updatedUser) {
          // Send security alert - gate with global channel preference AND per-category preference
          sendSecurityAlertNotification(
            updatedUser.email,
            updatedUser.phone,
            updatedUser.firstName,
            'password_change',
            'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
            updatedUser.notifyEmail && updatedUser.emailSecurityAlerts,
            updatedUser.notifySMS && updatedUser.smsSecurityAlerts
          ).catch(console.error);
        }
      });

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error: any) {
      if (error.message.includes("Invalid") || error.message.includes("already been used") || error.message.includes("expired")) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res, next) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const badges = await storage.getUserBadges(user.id);
      const { password, ...userWithoutPassword } = user;
      res.json({ user: { ...userWithoutPassword, badges } });
    } catch (error) {
      next(error);
    }
  });

  // Update user profile
  app.put("/api/user/profile", requireAuth, async (req, res, next) => {
    try {
      const profileSchema = z.object({
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Username must be lowercase letters, numbers, and underscores only").optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).max(15).optional(),
        bio: z.string().max(500).optional(),
        location: z.string().max(100).optional(),
        avatar: z.string().url().optional(),
      });

      const data = profileSchema.parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if username is being changed and if it's already taken
      if (data.username && data.username !== user.username) {
        const existingUser = await storage.getUserByUsername(data.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Username already taken" });
        }
      }

      // Check if email is being changed and if it's already taken
      if (data.email && data.email !== user.email) {
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      // Update user profile
      await storage.updateUser(userId, data);
      
      // Send account change notification if email/phone changed
      if (data.email !== undefined || data.phone !== undefined) {
        const changeDetails = [];
        if (data.email && data.email !== user.email) changeDetails.push(`Email changed to ${data.email}`);
        if (data.phone && data.phone !== user.phone) changeDetails.push(`Phone changed to ${data.phone}`);
        
        if (changeDetails.length > 0) {
          sendAccountChangeNotification(
            user.email,
            user.phone,
            user.firstName,
            data.email ? 'email_updated' : 'phone_updated',
            changeDetails.join('. '),
            user.notifyEmail && user.emailAccountChanges,
            user.notifySMS && user.smsAccountChanges
          ).catch(console.error);
        }
      }

      const updatedUser = await storage.getUser(userId);
      const { password, ...userWithoutPassword } = updatedUser!;
      res.json({ message: "Profile updated successfully", user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Update user avatar
  app.post("/api/user/avatar", requireAuth, async (req, res, next) => {
    try {
      const avatarSchema = z.object({
        objectPath: z.string().min(1).refine(
          (path) => path.startsWith('/objects/uploads/'),
          { message: "Invalid object path" }
        ),
      });

      const { objectPath } = avatarSchema.parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Validate that the object exists
      const exists = await fileStorageService.fileExists(objectPath);
      if (!exists) {
        return res.status(400).json({ error: "Uploaded file not found" });
      }

      // Set ACL policy on Replit storage; skip on Azure (has its own access control)
      let normalizedPath = objectPath;
      if (!isAzureStorage()) {
        try {
          const replitService = fileStorageService.getReplitService();
          if (replitService) {
            normalizedPath = await replitService.trySetObjectEntityAclPolicy(objectPath, {
              owner: userId,
              visibility: "public",
            });
          }
        } catch (aclError) {
          console.error("Error setting ACL policy:", aclError);
          return res.status(500).json({ error: "Failed to process uploaded image" });
        }
      }

      // Update user avatar URL
      await storage.updateUser(userId, { avatar: normalizedPath });
      
      const updatedUser = await storage.getUser(userId);
      const { password, ...userWithoutPassword } = updatedUser!;
      res.json({ message: "Avatar updated successfully", user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Get presigned URL for avatar upload
  app.post("/api/user/avatar/upload-url", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      let result: { uploadURL: string; objectPath: string } | null = null;
      let lastError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await fileStorageService.getUploadURL();
          break;
        } catch (err) {
          lastError = err;
          console.error(`Avatar upload URL attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
          if (attempt < 2) await new Promise(r => setTimeout(r, 500));
        }
      }
      if (!result) {
        console.error("All avatar upload URL attempts failed:", lastError);
        return res.status(500).json({ error: "Storage service temporarily unavailable. Please try again." });
      }
      res.json({ 
        uploadURL: result.uploadURL, 
        objectPath: result.objectPath,
        constraints: {
          maxSizeBytes: 5 * 1024 * 1024,
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        }
      });
    } catch (error) {
      console.error("Error generating avatar upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Pool routes
  app.get("/api/pools", requireAuth, async (req, res, next) => {
    try {
      const pools = await storage.getPools();
      res.json({ pools });
    } catch (error) {
      next(error);
    }
  });

  // Public pool viewing - no auth required for shared links
  app.get("/api/pools/:id/public", async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      // Check if pool allows public viewing
      if (pool.status !== 'active' && pool.status !== 'completed') {
        return res.status(403).json({ message: "This pool is no longer active" });
      }

      const [creator, contributions] = await Promise.all([
        storage.getUser(pool.creatorId),
        storage.getContributionsByPool(pool.id),
      ]);

      // Get contributors with limited user info (privacy)
      const contributorsData = await Promise.all(
        contributions.map(async (c) => {
          if (!c.userId) {
            return {
              user: { name: c.guestEmail ? 'Guest' : 'Anonymous', avatar: null },
              amount: c.amount,
              date: c.createdAt.toISOString(),
            };
          }
          const user = await storage.getUser(c.userId);
          return {
            user: user ? { 
              name: `${user.firstName} ${user.lastName?.[0] || ''}`.trim(), 
              avatar: user.avatar 
            } : null,
            amount: c.amount,
            date: c.createdAt.toISOString(),
          };
        })
      );

      res.json({
        pool: {
          id: pool.id,
          creatorId: 'private',
          title: pool.title,
          description: pool.description,
          targetAmount: pool.targetAmount,
          currentAmount: pool.currentAmount,
          deadline: pool.deadline,
          status: pool.status,
          category: pool.category,
          creator: { 
            name: creator ? `${creator.firstName[0]}***` : 'Anonymous',
            firstName: creator?.firstName?.[0] ? `${creator.firstName[0]}***` : 'A',
            lastName: '',
            avatar: null,
          },
          contributors: [],
          contributorCount: contributions.length,
          comments: [],
        },
        isPublic: true,
      });
    } catch (error) {
      next(error);
    }
  });

  // Guest contribution via Stripe (no auth required)
  app.post("/api/pools/:id/contribute-guest", async (req, res, next) => {
    try {
      const { amount, email, name } = z.object({ 
        amount: z.string().refine(val => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 1 && num <= 10000;
        }, "Amount must be between $1 and $10,000"),
        email: z.string().email().optional(),
        name: z.string().min(1).max(100).optional(),
      }).parse(req.body);
      
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }
      
      if (pool.status !== 'active') {
        return res.status(400).json({ message: "This pool is no longer accepting contributions" });
      }

      const amountCents = Math.round(parseFloat(amount) * 100);
      const stripe = await getUncachableStripeClient();
      
      // Get the base URL for success/cancel redirects
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://chipinpool.azurewebsites.net'
        : `http://localhost:5000`;

      // Create a Stripe Checkout session for guest payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Contribution to ${pool.title}`,
              description: `Guest contribution to pool`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/pool/${pool.id}?contributed=true&guest=true`,
        cancel_url: `${baseUrl}/pool/${pool.id}`,
        customer_email: email,
        metadata: {
          poolId: pool.id,
          amount: amount,
          type: 'pool_contribution',
          guestName: name || 'Anonymous Guest',
        },
      });

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/pools/:id/activity", requireAuth, async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) return res.status(404).json({ message: "Pool not found" });
      
      const activities = await storage.getPoolActivities(req.params.id);
      const poolContributions = await storage.getContributionsByPool(req.params.id);
      
      const contributionActivities = await Promise.all(poolContributions.map(async (c) => {
        const user = c.userId ? await storage.getUser(c.userId) : null;
        return {
          id: `contrib-${c.id}`,
          type: 'contribution' as const,
          amount: c.amount,
          description: user ? `${user.firstName} ${user.lastName} contributed` : (c.guestEmail ? `${c.guestEmail} contributed` : 'Guest contributed'),
          userName: user ? `${user.firstName} ${user.lastName}` : (c.guestEmail || 'Guest'),
          userAvatar: user?.avatar || null,
          createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
        };
      }));
      
      const otherActivities = activities.filter(a => a.type !== 'contribution').map(a => ({
        id: `${a.type}-${a.id}`,
        type: a.type as string,
        amount: a.amount,
        description: a.description || (a.type === 'spend' ? `Spent at ${a.merchant || 'merchant'}` : a.type === 'withdrawal' ? 'Withdrew to bank' : 'Transferred to user'),
        merchant: a.merchant,
        userName: null,
        userAvatar: null,
        createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
      }));
      
      const allActivities = [...contributionActivities, ...otherActivities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const raised = parseFloat(pool.currentAmount) + parseFloat(pool.spentAmount);
      const spent = parseFloat(pool.spentAmount);
      const remaining = parseFloat(pool.currentAmount);
      
      res.json({
        activities: allActivities,
        summary: {
          raised: raised.toFixed(2),
          spent: spent.toFixed(2),
          remaining: remaining.toFixed(2),
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/pools/:id", requireAuth, async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      const [creator, contributions, comments] = await Promise.all([
        storage.getUser(pool.creatorId),
        storage.getContributionsByPool(pool.id),
        storage.getCommentsByPool(pool.id),
      ]);

      // Get contributors with user info
      const contributorsData = await Promise.all(
        contributions.map(async (c) => {
          if (!c.userId) {
            // Guest contribution
            return {
              user: { name: c.guestEmail || 'Anonymous Guest', avatar: null, badges: [] },
              amount: c.amount,
              date: c.createdAt.toISOString(),
            };
          }
          const user = await storage.getUser(c.userId);
          const badges = await storage.getUserBadges(c.userId);
          return {
            user: user ? { ...user, badges, password: undefined } : null,
            amount: c.amount,
            date: c.createdAt.toISOString(),
          };
        })
      );

      // Get comments with user info
      const commentsData = await Promise.all(
        comments.map(async (c) => {
          const user = await storage.getUser(c.userId);
          const badges = await storage.getUserBadges(c.userId);
          return {
            id: c.id,
            userId: c.userId,
            user: user ? { ...user, badges, password: undefined } : null,
            text: c.text,
            timestamp: c.createdAt.toISOString(),
            likes: c.likes,
          };
        })
      );

      const badges = await storage.getUserBadges(pool.creatorId);
      
      res.json({
        pool: {
          ...pool,
          creator: creator ? { ...creator, badges, password: undefined } : null,
          contributors: contributorsData.filter((c) => c.user !== null),
          comments: commentsData.filter((c) => c.user !== null),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/pools", requireAuth, async (req, res, next) => {
    try {
      // Convert deadline string to Date before validation
      const requestBody = {
        ...req.body,
        creatorId: req.session.userId,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      };
      
      const data = insertPoolSchema.parse(requestBody);

      const pool = await storage.createPool(data);
      
      // Update user stats
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        await storage.updateUserStats(req.session.userId!, user.poolsCreated + 1);
      }

      // Award gamification points for pool creation
      awardPoolCreationPoints(req.session.userId!, pool.id).catch(err => 
        console.error('[Gamification] Error awarding pool creation points:', err)
      );

      res.json({ pool });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/pools/:id", requireAuth, async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      if (pool.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "Only the pool creator can edit this pool" });
      }

      const updateSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        targetAmount: z.string().optional(),
        deadline: z.string().optional(),
        image: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      const updatedPool = await storage.updatePool(pool.id, {
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        image: data.image,
      });

      res.json({ pool: updatedPool });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/pools/:id/contribute", requireAuth, async (req, res, next) => {
    try {
      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const pool = await storage.getPool(req.params.id);
      
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough balance
      const userBalance = parseFloat(user.balance);
      const contributionAmount = parseFloat(amount);
      
      if (userBalance < contributionAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create contribution
      const contribution = await storage.createContribution({
        poolId: pool.id,
        userId: user.id,
        amount,
      });

      // Record pool activity for contribution
      await storage.createPoolActivity({
        poolId: pool.id,
        userId: req.session.userId!,
        type: 'contribution',
        amount: amount,
        description: `${user.firstName} ${user.lastName} contributed`,
        referenceId: contribution.id,
      });

      // Update pool amount
      const newPoolAmount = (parseFloat(pool.currentAmount) + contributionAmount).toFixed(2);
      await storage.updatePoolAmount(pool.id, newPoolAmount);

      // Update user balance and stats
      const newUserBalance = (userBalance - contributionAmount).toFixed(2);
      await storage.updateUserBalance(user.id, newUserBalance);
      
      const newTotalContributed = (parseFloat(user.totalContributed) + contributionAmount).toFixed(2);
      await storage.updateUserStats(user.id, undefined, newTotalContributed);

      // Get pool creator for notifications
      const poolCreator = await storage.getUser(pool.creatorId);

      // Check if pool goal is reached
      if (parseFloat(newPoolAmount) >= parseFloat(pool.targetAmount)) {
        await storage.updatePoolStatus(pool.id, 'completed');
        
        // Check if this pool is linked to a merchant checkout session
        const merchantSession = await storage.getMerchantCheckoutSessionByPoolId(pool.id);
        if (merchantSession && merchantSession.status === 'collecting') {
          // Complete the checkout session
          await storage.updateCheckoutSessionStatus(
            merchantSession.id, 
            'completed', 
            newPoolAmount
          );
          
          // Update merchant stats - add net amount to pending balance
          const netAmount = parseFloat(merchantSession.netAmount);
          const feeAmount = parseFloat(merchantSession.feeAmount);
          const totalAmount = parseFloat(merchantSession.amount);
          await storage.updateMerchantStats(merchantSession.merchantId, netAmount, feeAmount, totalAmount);
          
          // Send webhook to merchant
          const merchant = await storage.getMerchant(merchantSession.merchantId);
          if (merchant?.webhookUrl) {
            sendMerchantWebhook(merchant, merchantSession.id, 'session.completed', {
              sessionId: merchantSession.id,
              orderId: merchantSession.externalOrderId,
              status: 'completed',
              poolId: pool.id,
              amount: totalAmount,
              netAmount: netAmount,
              feeAmount: feeAmount,
              completedAt: new Date().toISOString(),
            });
          }
          
          console.log(`[ChipInPay] Session ${merchantSession.id} completed. Merchant ${merchantSession.merchantId} earned $${netAmount.toFixed(2)}`);
          
          // Send push notification to merchant owner
          if (merchant) {
            const merchantOwner = await storage.getUser(merchant.userId);
            if (merchantOwner?.notifyPush) {
              sendPushNotification(
                merchant.userId,
                '💳 Order Funded!',
                `Order "${merchantSession.productTitle}" has been fully funded! You earned $${netAmount.toFixed(2)}`,
                '/merchant-dashboard'
              ).catch(err => console.error('[Push] Merchant order notification failed:', err));
            }
          }
        }
        
        // Create notification for pool creator
        await storage.createNotification({
          userId: pool.creatorId,
          type: 'goal_reached',
          title: 'Goal Reached! 🎉',
          message: `${pool.title} has been fully funded!`,
          link: `/pool/${pool.id}`,
        });

        // Send email/SMS notification for pool completion
        if (poolCreator) {
          sendPoolCompletedNotification(
            poolCreator.email,
            poolCreator.phone,
            `${poolCreator.firstName} ${poolCreator.lastName}`,
            pool.id,
            pool.title,
            pool.targetAmount,
            poolCreator.notifyEmail,
            poolCreator.notifySMS
          ).catch(err => console.error('[Notification] Pool completed notification failed:', err));
          
          // Send push notification for pool completion
          if (poolCreator.notifyPush) {
            sendPushNotification(
              pool.creatorId,
              '🎉 Pool Complete!',
              `Your pool "${pool.title}" has reached its goal of $${pool.targetAmount}!`,
              `/pool/${pool.id}`
            ).catch(err => console.error('[Push] Pool completed notification failed:', err));
          }
        }
      }
      
      // Check for 90% milestone (only if not already completed)
      const currentPercentage = (parseFloat(newPoolAmount) / parseFloat(pool.targetAmount)) * 100;
      const previousPercentage = (parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100;
      if (previousPercentage < 90 && currentPercentage >= 90 && currentPercentage < 100) {
        if (poolCreator?.notifyPush) {
          sendPushNotification(
            pool.creatorId,
            '🔥 Almost There!',
            `Your pool "${pool.title}" has reached 90% of its goal!`,
            `/pool/${pool.id}`
          ).catch(err => console.error('[Push] 90% milestone notification failed:', err));
        }
      }

      // Create notification for pool creator
      await storage.createNotification({
        userId: pool.creatorId,
        type: 'contribution',
        title: 'New Contribution',
        message: `${user.firstName} ${user.lastName} chipped in $${amount} to ${pool.title}`,
        link: `/pool/${pool.id}`,
      });

      // Send email/SMS notification for contribution (only if contributor is not the pool creator)
      if (poolCreator && pool.creatorId !== user.id) {
        sendPoolContributionNotification(
          poolCreator.email,
          poolCreator.phone,
          `${poolCreator.firstName} ${poolCreator.lastName}`,
          `${user.firstName} ${user.lastName}`,
          pool.id,
          pool.title,
          amount,
          poolCreator.notifyEmail,
          poolCreator.notifySMS
        ).catch(err => console.error('[Notification] Contribution notification failed:', err));
        
        // Send push notification for contribution
        if (poolCreator.notifyPush) {
          sendPushNotification(
            pool.creatorId,
            '💰 New Contribution!',
            `${user.firstName} ${user.lastName} contributed $${amount} to "${pool.title}"`,
            `/pool/${pool.id}`
          ).catch(err => console.error('[Push] Contribution notification failed:', err));
        }
      }

      // Award gamification points for contribution
      awardContributionPoints(user.id, amount).catch(err => 
        console.error('[Gamification] Error awarding contribution points:', err)
      );

      // Award pool completion points if goal reached
      if (parseFloat(newPoolAmount) >= parseFloat(pool.targetAmount)) {
        awardPoolCompletionPoints(pool.creatorId, pool.id, pool.title).catch(err => 
          console.error('[Gamification] Error awarding pool completion points:', err)
        );
      }

      res.json({ contribution });
    } catch (error) {
      next(error);
    }
  });

  // Comment routes
  app.post("/api/pools/:id/comments", requireAuth, async (req, res, next) => {
    try {
      const data = insertCommentSchema.parse({
        ...req.body,
        poolId: req.params.id,
        userId: req.session.userId,
      });

      const comment = await storage.createComment(data);
      const user = await storage.getUser(req.session.userId!);
      const badges = await storage.getUserBadges(req.session.userId!);

      res.json({
        comment: {
          ...comment,
          user: user ? { ...user, badges, password: undefined } : null,
          timestamp: comment.createdAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comments/:id/like", requireAuth, async (req, res, next) => {
    try {
      await storage.likeComment(req.params.id);
      res.json({ message: "Comment liked" });
    } catch (error) {
      next(error);
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res, next) => {
    try {
      await storage.markAllNotificationsAsRead(req.session.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  });

  // User deposit/withdraw routes
  app.post("/api/user/deposit", requireAuth, async (req, res, next) => {
    try {
      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const depositAmount = parseFloat(amount);
      
      if (isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newBalance = (parseFloat(user.balance) + depositAmount).toFixed(2);
      await storage.updateUserBalance(user.id, newBalance);

      res.json({ message: "Deposit successful", balance: newBalance });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/user/withdraw", requireAuth, async (req, res, next) => {
    try {
      const { amount, bankAccountId } = z.object({ 
        amount: z.string(),
        bankAccountId: z.string().optional()
      }).parse(req.body);
      const withdrawAmount = parseFloat(amount);
      
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentBalance = parseFloat(user.balance);
      if (currentBalance < withdrawAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const newBalance = (currentBalance - withdrawAmount).toFixed(2);
      await storage.updateUserBalance(user.id, newBalance);
      
      // Log the withdrawal
      await storage.createWalletWithdrawal(user.id, amount, bankAccountId);

      res.json({ message: "Withdrawal successful", balance: newBalance });
    } catch (error) {
      next(error);
    }
  });

  // Get wallet transaction history (deposits and withdrawals)
  app.get("/api/user/wallet-history", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const history = await storage.getWalletHistory(userId);
      
      // Combine and format for frontend
      const transactions = [
        ...history.deposits.map(d => ({
          id: d.id,
          type: 'deposit' as const,
          amount: d.amount,
          status: 'completed',
          createdAt: d.createdAt,
          stripeSessionId: d.stripeSessionId,
        })),
        ...history.withdrawals.map(w => ({
          id: w.id,
          type: 'withdrawal' as const,
          amount: w.amount,
          status: w.status,
          createdAt: w.createdAt,
          bankAccountId: w.bankAccountId,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/user/deposit/checkout", requireAuth, async (req, res, next) => {
    try {
      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const depositAmount = parseFloat(amount);
      
      if (isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      if (depositAmount > 10000) {
        return res.status(400).json({ message: "Maximum deposit amount is $10,000" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Support both Replit and Azure production environments
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Wallet Deposit',
              description: `Add $${amount} to your ChipIn wallet`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/profile?deposit=success`,
        cancel_url: `${baseUrl}/profile`,
        metadata: {
          type: 'wallet_deposit',
          userId: user.id,
          amount,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  });

  // Virtual Card routes
  app.get("/api/pools/:id/virtual-card", requireAuth, async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      // Authorization: Only pool creator can access virtual card
      if (pool.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "Only pool creator can access the virtual card" });
      }

      let card = await storage.getVirtualCardByPool(pool.id);
      
      // Create virtual card if it doesn't exist
      if (!card) {
        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Require KYC verification for virtual cards
        if (user.kycStatus !== 'verified') {
          return res.status(403).json({ message: "Identity verification required to create virtual cards" });
        }
        
        const stripe = await getUncachableStripeClient();
        
        // Create or get cardholder
        let cardholderId = user.stripeCardholderId;
        if (!cardholderId) {
          const cardholder = await stripe.issuing.cardholders.create({
            name: user.verifiedLegalName || `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone_number: user.phone || undefined,
            type: 'individual',
            billing: {
              address: {
                line1: user.verifiedAddress || '123 Main Street',
                city: user.verifiedCity || 'San Francisco',
                state: user.verifiedState || 'CA',
                postal_code: user.verifiedPostalCode || '94111',
                country: user.verifiedCountry || 'US',
              },
            },
          });
          cardholderId = cardholder.id;
          await storage.updateUser(user.id, { stripeCardholderId: cardholderId });
        }

        // Create virtual card via Stripe Issuing
        const stripeCard = await stripe.issuing.cards.create({
          cardholder: cardholderId,
          currency: 'usd',
          type: 'virtual',
          status: 'active',
          spending_controls: {
            spending_limits: [{
              amount: Math.round(parseFloat(pool.currentAmount) * 100),
              interval: 'all_time',
            }],
          },
          metadata: {
            poolId: pool.id,
            poolTitle: pool.title,
          },
        });

        // Get card details (only available for virtual cards)
        const cardDetails = await stripe.issuing.cards.retrieve(stripeCard.id, {
          expand: ['number', 'cvc'],
        });
        
        const cardNumber = cardDetails.number || '';
        const cvc = cardDetails.cvc || '';
        const expiry = `${String(stripeCard.exp_month).padStart(2, '0')}/${String(stripeCard.exp_year).slice(-2)}`;
        
        // Store only masked data - never store full PAN/CVC
        const maskedCardNumber = `************${cardNumber.slice(-4)}`;
        const maskedCvc = '***';
        
        card = await storage.createVirtualCard({
          poolId: pool.id,
          cardNumber: maskedCardNumber,
          expiry,
          cvc: maskedCvc,
          balance: pool.currentAmount,
          stripeCardId: stripeCard.id,
          lastFour: stripeCard.last4,
        });
      }

      // Mask sensitive card data for response - only show last 4 digits
      const maskedCard = {
        id: card.id,
        poolId: card.poolId,
        cardNumber: `**** **** **** ${card.cardNumber.slice(-4)}`,
        lastFour: card.lastFour || card.cardNumber.slice(-4),
        expiry: card.expiry,
        cvc: '***', // Never expose CVC
        balance: card.balance,
        isActive: card.isActive,
        stripeCardId: card.stripeCardId,
        createdAt: card.createdAt,
      };

      res.json({ card: maskedCard });
    } catch (error: any) {
      console.error('[Virtual Card] Error:', error.message, error.raw?.message || error.code || '');
      if (error.type === 'StripeInvalidRequestError' || error.raw) {
        return res.status(400).json({ 
          message: error.raw?.message || error.message || 'Failed to create virtual card',
          code: error.code,
        });
      }
      next(error);
    }
  });

  // Create ephemeral key for secure card detail retrieval via Stripe.js
  app.post("/api/pools/:id/virtual-card/ephemeral-key", requireAuth, async (req, res, next) => {
    try {
      const { nonce } = z.object({ nonce: z.string() }).parse(req.body);
      
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      // Authorization: Only pool creator can access card details
      if (pool.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "Only pool creator can access card details" });
      }

      const card = await storage.getVirtualCardByPool(pool.id);
      if (!card || !card.stripeCardId) {
        return res.status(404).json({ message: "No active virtual card found for this pool" });
      }

      const stripe = await getUncachableStripeClient();

      // Create ephemeral key for secure client-side card detail retrieval
      const ephemeralKey = await stripe.ephemeralKeys.create({
        nonce: nonce,
        issuing_card: card.stripeCardId,
      }, {
        apiVersion: '2024-12-18.acacia',
      });

      res.json({
        ephemeralKeySecret: ephemeralKey.secret,
        issuingCard: card.stripeCardId,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/virtual-cards/:id/transactions", requireAuth, async (req, res, next) => {
    try {
      const data = insertTransactionSchema.parse({
        ...req.body,
        virtualCardId: req.params.id,
      });

      const card = await storage.getVirtualCardById(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Virtual card not found" });
      }

      // Authorization: Only pool creator can spend from card
      const pool = await storage.getPool(card.poolId);
      if (!pool || pool.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "Only pool creator can spend from this card" });
      }

      const cardBalance = parseFloat(card.balance);
      const transactionAmount = parseFloat(data.amount);

      if (cardBalance < transactionAmount) {
        return res.status(400).json({ message: "Insufficient card balance" });
      }

      const transaction = await storage.createTransaction(data);
      
      // Update card balance
      const newBalance = (cardBalance - transactionAmount).toFixed(2);
      await storage.updateCardBalance(card.id, newBalance);

      // Record pool activity for spending
      await storage.createPoolActivity({
        poolId: pool!.id,
        userId: req.session.userId!,
        type: 'spend',
        amount: data.amount,
        description: `Spent at ${data.merchant || 'merchant'}`,
        merchant: data.merchant || null,
        referenceId: transaction.id,
      });
      
      // Update pool spent amount
      const currentSpent = parseFloat(pool!.spentAmount);
      const newSpentAmount = (currentSpent + transactionAmount).toFixed(2);
      await storage.updatePoolSpentAmount(pool!.id, newSpentAmount);
      
      // Auto-close Purchase pools after spending
      if (pool!.category === 'Purchase') {
        await storage.updatePoolStatus(pool!.id, 'completed');
      }

      // Send card transaction notification to pool creator
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        await storage.createNotification({
          userId: user.id,
          type: 'contribution',
          title: 'Card Transaction',
          message: `You spent $${data.amount} at ${data.merchant || 'a merchant'} from "${pool!.title}" card`,
          link: `/pool/${pool!.id}`,
        });
        
        // Send email/SMS notification
        const { sendCardActivityNotification } = await import('./notificationService');
        sendCardActivityNotification(
          user.email,
          user.phone,
          `${user.firstName} ${user.lastName}`,
          'transaction',
          `Spent at ${data.merchant || 'a merchant'} from "${pool!.title}" pool card`,
          data.amount,
          user.notifyEmail,
          user.notifySMS
        ).catch(err => console.error('[Notification] Card transaction notification failed:', err));
      }

      res.json({ transaction, newBalance });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/virtual-cards/:id/transactions", requireAuth, async (req, res, next) => {
    try {
      const card = await storage.getVirtualCardById(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Virtual card not found" });
      }

      // Authorization: Only pool creator can view transactions
      const pool = await storage.getPool(card.poolId);
      if (!pool || pool.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "Only pool creator can view transactions" });
      }

      const transactions = await storage.getTransactionsByCard(req.params.id);
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  // User profile routes
  app.get("/api/users/:id/profile", requireAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [badges, createdPools, followers, following] = await Promise.all([
        storage.getUserBadges(user.id),
        storage.getPoolsByCreator(user.id),
        storage.getFollowers(user.id),
        storage.getFollowing(user.id),
      ]);

      const isFollowing = req.session.userId ? await storage.isFollowing(req.session.userId, user.id) : false;

      const { password, ...userWithoutPassword } = user;
      res.json({
        user: {
          ...userWithoutPassword,
          badges,
          followerCount: followers.length,
          followingCount: following.length,
        },
        pools: createdPools,
        isFollowing,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/pools", requireAuth, async (req, res, next) => {
    try {
      const [createdPools, contributedPools] = await Promise.all([
        storage.getPoolsByCreator(req.params.id),
        storage.getPoolsByContributor(req.params.id),
      ]);

      res.json({ createdPools, contributedPools });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users/:id/follow", requireAuth, async (req, res, next) => {
    try {
      await storage.followUser(req.session.userId!, req.params.id);
      res.json({ message: "User followed" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id/follow", requireAuth, async (req, res, next) => {
    try {
      await storage.unfollowUser(req.session.userId!, req.params.id);
      res.json({ message: "User unfollowed" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/following", async (req, res, next) => {
    try {
      const followingIds = await storage.getFollowing(req.params.id);
      const followingUsers = await Promise.all(
        followingIds.map(async (id) => {
          const user = await storage.getUser(id);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
          }
          return null;
        })
      );
      res.json({ following: followingUsers.filter(Boolean) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/followers", async (req, res, next) => {
    try {
      const followerIds = await storage.getFollowers(req.params.id);
      const followerUsers = await Promise.all(
        followerIds.map(async (id) => {
          const user = await storage.getUser(id);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
          }
          return null;
        })
      );
      res.json({ followers: followerUsers.filter(Boolean) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/is-following", requireAuth, async (req, res, next) => {
    try {
      const isFollowing = await storage.isFollowing(req.session.userId!, req.params.id);
      res.json({ isFollowing });
    } catch (error) {
      next(error);
    }
  });

  // Invite routes
  app.post("/api/pools/:id/invite", requireAuth, async (req, res, next) => {
    try {
      const poolId = req.params.id;
      const inviterId = req.session.userId!;
      const { method, recipients } = z.object({
        method: z.enum(['email', 'sms', 'push']),
        recipients: z.array(z.string()).min(1),
      }).parse(req.body);

      const pool = await storage.getPool(poolId);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      const inviter = await storage.getUser(inviterId);
      if (!inviter) {
        return res.status(404).json({ message: "User not found" });
      }

      const invites = [];
      const notifications = [];

      for (const recipient of recipients) {
        if (method === 'push') {
          const inviteeUser = await storage.getUser(recipient);
          if (inviteeUser) {
            const invite = await storage.createInvite({
              poolId,
              inviterId,
              inviteeId: inviteeUser.id,
              method: 'push',
            });
            invites.push(invite);

            const notification = await storage.createNotification({
              userId: inviteeUser.id,
              type: 'pool_invite',
              title: 'Pool Invitation',
              message: `${inviter.firstName} ${inviter.lastName} invited you to join "${pool.title}"`,
              link: `/pool/${poolId}`,
            });
            notifications.push(notification);
          }
        } else if (method === 'email') {
          const existingUser = await storage.getUserByEmail(recipient);
          const invite = await storage.createInvite({
            poolId,
            inviterId,
            inviteeId: existingUser?.id || null,
            inviteeEmail: recipient,
            method: 'email',
          });
          invites.push(invite);

          // Send actual email via Resend
          const poolUrl = `${req.protocol}://${req.get('host')}/pool/${poolId}`;
          await sendPoolInviteEmail(recipient, `${inviter.firstName} ${inviter.lastName}`, pool.title, poolUrl);

          if (existingUser) {
            const notification = await storage.createNotification({
              userId: existingUser.id,
              type: 'pool_invite',
              title: 'Pool Invitation',
              message: `${inviter.firstName} ${inviter.lastName} invited you to join "${pool.title}"`,
              link: `/pool/${poolId}`,
            });
            notifications.push(notification);
          }
        } else if (method === 'sms') {
          const existingUser = await storage.getUserByPhone(recipient);
          const invite = await storage.createInvite({
            poolId,
            inviterId,
            inviteeId: existingUser?.id || null,
            inviteePhone: recipient,
            method: 'sms',
          });
          invites.push(invite);

          // Send actual SMS via ClickSend
          const poolUrl = `${req.protocol}://${req.get('host')}/pool/${poolId}`;
          await sendPoolInviteSMS(recipient, `${inviter.firstName} ${inviter.lastName}`, pool.title, poolUrl);

          if (existingUser) {
            const notification = await storage.createNotification({
              userId: existingUser.id,
              type: 'pool_invite',
              title: 'Pool Invitation',
              message: `${inviter.firstName} ${inviter.lastName} invited you to join "${pool.title}"`,
              link: `/pool/${poolId}`,
            });
            notifications.push(notification);
          }
        }
      }

      res.json({ 
        message: `${invites.length} invite(s) sent successfully`,
        invites,
        notifications: notifications.length,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/pools/:id/invites", requireAuth, async (req, res, next) => {
    try {
      const invites = await storage.getPoolInvites(req.params.id);
      res.json({ invites });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/my-followers", requireAuth, async (req, res, next) => {
    try {
      const followers = await storage.getFollowersWithDetails(req.session.userId!);
      const followersWithoutPassword = followers.map(f => {
        const { password, ...rest } = f;
        return rest;
      });
      res.json({ followers: followersWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // Stripe routes
  app.get("/api/stripe/config", async (req, res, next) => {
    try {
      const publishableKey = await getStripePublishableKey();
      if (!publishableKey) {
        console.error('Stripe publishable key is undefined or empty');
        return res.status(500).json({ error: 'Stripe configuration not available' });
      }
      console.log('Stripe config requested, key prefix:', publishableKey.substring(0, 7) + '...');
      res.json({ publishableKey });
    } catch (error: any) {
      console.error('Failed to get Stripe config:', error.message);
      next(error);
    }
  });

  // Contribute to pool using linked bank account (ACH)
  app.post("/api/pools/:id/contribute-bank", requireAuth, async (req, res, next) => {
    try {
      const { amount, bankAccountId } = z.object({ 
        amount: z.string(),
        bankAccountId: z.string(),
      }).parse(req.body);
      
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get bank account
      const bankAccount = await storage.getBankAccountById(bankAccountId);
      if (!bankAccount || bankAccount.userId !== user.id) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      // Verify the bank account has Stripe Financial Connections link
      if (!bankAccount.stripeFinancialConnectionsAccountId) {
        return res.status(400).json({ error: "Bank account not properly linked. Please re-link in Settings." });
      }

      const stripe = await getUncachableStripeClient();
      const amountCents = Math.round(parseFloat(amount) * 100);

      console.log('[Bank Contribute] Starting payment for pool:', pool.id, 'amount:', amount);
      console.log('[Bank Contribute] Bank account:', {
        id: bankAccount.id,
        mask: bankAccount.accountMask,
        fcAccountId: bankAccount.stripeFinancialConnectionsAccountId,
        storedPaymentMethodId: bankAccount.stripePaymentMethodId,
      });

      // Try to get or find the payment method for this bank account
      let paymentMethodId = bankAccount.stripePaymentMethodId;
      
      // If we don't have a stored payment method but have a customer, try to find it
      if (!paymentMethodId && user.stripeCustomerId) {
        try {
          console.log('[Bank Contribute] Looking up payment methods for customer:', user.stripeCustomerId);
          const paymentMethods = await stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'us_bank_account',
          });
          
          console.log('[Bank Contribute] Found', paymentMethods.data.length, 'bank payment methods');
          
          // Find payment method matching this bank account by last4
          const matchingPM = paymentMethods.data.find(pm => {
            const pmLast4 = pm.us_bank_account?.last4;
            console.log('[Bank Contribute] Comparing PM last4:', pmLast4, 'to bank mask:', bankAccount.accountMask);
            return pmLast4 === bankAccount.accountMask;
          });
          
          if (matchingPM) {
            paymentMethodId = matchingPM.id;
            console.log('[Bank Contribute] Found payment method:', matchingPM.id);
            // Try to update the bank account with the found payment method (may fail if column doesn't exist)
            try {
              await storage.updateBankAccount(bankAccount.id, { stripePaymentMethodId: matchingPM.id });
              console.log('[Bank Contribute] Stored payment method ID in database');
            } catch (updateErr) {
              console.log('[Bank Contribute] Could not store payment method ID (column may not exist yet)');
            }
          } else {
            console.log('[Bank Contribute] No matching payment method found by last4');
            // List all payment methods for debugging
            paymentMethods.data.forEach((pm, i) => {
              console.log(`[Bank Contribute] PM ${i}: ${pm.id}, last4: ${pm.us_bank_account?.last4}`);
            });
          }
        } catch (e: any) {
          console.log('[Bank Contribute] Could not retrieve payment methods:', e.message);
        }
      }

      // If we have a payment method, use it directly without redirecting
      if (paymentMethodId && user.stripeCustomerId) {
        try {
          // Create a PaymentIntent with the payment method
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            customer: user.stripeCustomerId,
            payment_method: paymentMethodId,
            payment_method_types: ['us_bank_account'],
            confirm: true,
            mandate_data: {
              customer_acceptance: {
                type: 'online',
                online: {
                  ip_address: getClientIp(req),
                  user_agent: req.get('user-agent') || 'ChipInPool',
                },
              },
            },
            metadata: {
              poolId: pool.id,
              userId: user.id,
              bankAccountId: bankAccount.id,
              paymentType: 'bank_ach_direct',
            },
          });

          console.log('[Bank Contribute] Created PaymentIntent:', paymentIntent.id, 'status:', paymentIntent.status);

          // ACH payments are usually 'processing' after confirmation (takes 1-3 business days)
          if (paymentIntent.status === 'processing' || paymentIntent.status === 'succeeded') {
            // Create the contribution record using stripeSessionId to store payment intent
            await storage.createContribution({
              poolId: pool.id,
              userId: user.id,
              amount: amount,
              stripeSessionId: paymentIntent.id, // Store PaymentIntent ID here
            });

            // Update pool current amount
            const currentAmount = parseFloat(pool.currentAmount || '0');
            const newAmount = currentAmount + parseFloat(amount);
            await storage.updatePoolAmount(pool.id, newAmount.toFixed(2));

            return res.json({ 
              success: true, 
              status: paymentIntent.status,
              message: paymentIntent.status === 'succeeded' 
                ? 'Payment completed!' 
                : 'Payment initiated. ACH transfers typically take 1-3 business days to process.',
            });
          } else if (paymentIntent.status === 'requires_action') {
            // Bank may require additional verification
            return res.json({
              success: false,
              status: paymentIntent.status,
              clientSecret: paymentIntent.client_secret,
              message: 'Additional verification required',
            });
          } else {
            return res.status(400).json({ 
              error: `Payment failed with status: ${paymentIntent.status}` 
            });
          }
        } catch (paymentError: any) {
          console.error('[Bank Contribute] Direct payment error:', paymentError.message, paymentError.code);
          // Return the error to the user instead of silently falling back
          return res.status(400).json({ 
            error: `Bank payment failed: ${paymentError.message}`,
            code: paymentError.code,
            needsReauthorization: paymentError.code === 'payment_intent_mandate_invalid',
          });
        }
      }
      
      // No payment method found - user needs to re-link their bank account
      console.log('[Bank Contribute] No payment method found for bank account');
      console.log('[Bank Contribute] paymentMethodId:', paymentMethodId, 'stripeCustomerId:', user.stripeCustomerId);
      
      return res.status(400).json({ 
        error: "Your bank account needs to be re-linked to enable direct payments. Please go to Settings and re-link your bank account.",
        needsRelink: true,
      });
    } catch (error: any) {
      console.error('[Bank Contribute] Error:', error.message);
      next(error);
    }
  });

  // Create checkout session for pool contribution (authenticated users)
  app.post("/api/pools/:poolId/checkout", requireAuth, async (req, res, next) => {
    try {
      const { amount } = req.body;
      const poolId = req.params.poolId;
      const userId = req.session.userId!;

      const pool = await storage.getPool(poolId);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Support both Replit and Azure production environments
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Contribution to ${pool.title}`,
              description: pool.description || undefined,
            },
            unit_amount: Math.round(parseFloat(amount) * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/pool/${poolId}?payment=success`,
        cancel_url: `${baseUrl}/pool/${poolId}?payment=cancelled`,
        metadata: {
          poolId,
          userId,
          amount,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // Developer API - Third Party Checkout Integration
  // ============================================

  // Public endpoint for 3rd party checkout (no auth required)
  app.post("/api/v1/checkout", async (req, res, next) => {
    try {
      const { poolId, amount, customerEmail, successUrl, cancelUrl } = req.body;

      // Validate required fields
      if (!poolId || !amount) {
        return res.status(400).json({ error: "poolId and amount are required" });
      }

      // Validate amount is a positive number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000) {
        return res.status(400).json({ error: "Amount must be between $0.01 and $10,000" });
      }

      const pool = await storage.getPool(poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      // Check pool is active
      if (pool.status !== 'active') {
        return res.status(400).json({ error: "Pool is not accepting contributions" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Support both Replit and Azure production environments
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: customerEmail,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Contribution to ${pool.title}`,
              description: pool.description || undefined,
              images: pool.image ? [pool.image] : undefined,
            },
            unit_amount: Math.round(parseFloat(amount) * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl || `${baseUrl}/pool/${poolId}?payment=success`,
        cancel_url: cancelUrl || `${baseUrl}/pool/${poolId}?payment=cancelled`,
        metadata: {
          poolId,
          amount,
          source: 'api',
        },
      });

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id,
        expiresAt: new Date(session.expires_at * 1000).toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Get pool info for 3rd party integrations (public)
  app.get("/api/v1/pools/:poolId", async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      // Return limited public info
      res.json({
        id: pool.id,
        title: pool.title,
        description: pool.description,
        targetAmount: pool.targetAmount,
        currentAmount: pool.currentAmount,
        category: pool.category,
        image: pool.image,
        deadline: pool.deadline,
        status: pool.status,
        percentComplete: Math.min(100, Math.round((parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100)),
      });
    } catch (error) {
      next(error);
    }
  });

  // Check payment status for 3rd party (public)
  app.get("/api/v1/checkout/:sessionId", async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

      res.json({
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        poolId: session.metadata?.poolId,
      });
    } catch (error) {
      next(error);
    }
  });

  // ========== RECURRING CONTRIBUTIONS ROUTES ==========

  // Create a recurring contribution (subscription)
  app.post("/api/pools/:id/recurring", requireAuth, async (req, res, next) => {
    try {
      const { amount, frequency, startImmediately } = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, { message: "Amount must be a positive number" }),
        frequency: z.enum(['weekly', 'monthly', 'quarterly']),
        startImmediately: z.boolean().optional().default(true),
      }).parse(req.body);

      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      if (pool.status !== 'active') {
        return res.status(400).json({ message: "This pool is not active" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const contributionAmount = parseFloat(amount);
      const userBalance = parseFloat(user.balance);

      // If starting immediately, validate sufficient balance
      if (startImmediately && userBalance < contributionAmount) {
        return res.status(400).json({ 
          message: "Insufficient balance for the first contribution. Please add funds to your wallet." 
        });
      }

      // Calculate next payment date based on frequency
      const now = new Date();
      let nextPaymentDate = new Date(now);
      if (startImmediately) {
        // If starting immediately, next payment is in the future
        if (frequency === 'weekly') {
          nextPaymentDate.setDate(now.getDate() + 7);
        } else if (frequency === 'monthly') {
          nextPaymentDate.setMonth(now.getMonth() + 1);
        } else if (frequency === 'quarterly') {
          nextPaymentDate.setMonth(now.getMonth() + 3);
        }
      }
      // If not starting immediately, nextPaymentDate is now (will be processed by cron)

      // Process first contribution immediately if requested
      if (startImmediately) {
        await storage.updateUserBalance(userId, (userBalance - contributionAmount).toFixed(2));
        await storage.createContribution({ poolId: pool.id, userId, amount });
        await storage.updatePoolAmount(pool.id, (parseFloat(pool.currentAmount) + contributionAmount).toFixed(2));
      }

      // Create recurring contribution record
      const recurringContribution = await storage.createRecurringContribution({
        poolId: pool.id,
        userId,
        amount,
        frequency,
        nextPaymentDate,
      });

      res.json({ 
        recurringContribution,
        message: startImmediately 
          ? `Recurring ${frequency} contribution of $${amount} set up successfully. First payment processed.`
          : `Recurring ${frequency} contribution of $${amount} scheduled. First payment will process within the hour.`,
      });
    } catch (error) {
      next(error);
    }
  });

  // Get recurring contributions for a pool
  app.get("/api/pools/:id/recurring", requireAuth, async (req, res, next) => {
    try {
      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      const contributions = await storage.getRecurringContributionsByPool(pool.id);
      res.json({ contributions });
    } catch (error) {
      next(error);
    }
  });

  // Get user's recurring contributions
  app.get("/api/user/recurring-contributions", requireAuth, async (req, res, next) => {
    try {
      const contributions = await storage.getRecurringContributionsByUser(req.session.userId!);
      
      // Enrich with pool data
      const enrichedContributions = await Promise.all(
        contributions.map(async (c) => {
          const pool = await storage.getPool(c.poolId);
          return {
            ...c,
            pool: pool ? {
              id: pool.id,
              title: pool.title,
              targetAmount: pool.targetAmount,
              currentAmount: pool.currentAmount,
            } : null,
          };
        })
      );
      
      res.json({ contributions: enrichedContributions });
    } catch (error) {
      next(error);
    }
  });

  // Update a recurring contribution (pause/resume, change amount/frequency)
  app.patch("/api/recurring/:id", requireAuth, async (req, res, next) => {
    try {
      const { amount, frequency, status } = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, { message: "Amount must be a positive number" }).optional(),
        frequency: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
        status: z.enum(['active', 'paused']).optional(),
      }).parse(req.body);

      const userId = req.session.userId!;
      const contribution = await storage.getRecurringContributionById(req.params.id);
      
      if (!contribution || contribution.userId !== userId) {
        return res.status(404).json({ message: "Recurring contribution not found or you don't have permission to modify it" });
      }

      if (contribution.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot modify a cancelled recurring contribution" });
      }

      const updates: { amount?: string; frequency?: 'weekly' | 'monthly' | 'quarterly'; status?: string } = {};
      if (amount !== undefined) updates.amount = amount;
      if (frequency !== undefined) updates.frequency = frequency;
      if (status !== undefined) updates.status = status;

      const updated = await storage.updateRecurringContribution(req.params.id, updates);
      
      res.json({ 
        recurringContribution: updated,
        message: status === 'paused' ? 'Recurring contribution paused' : 
                 status === 'active' ? 'Recurring contribution resumed' :
                 'Recurring contribution updated successfully'
      });
    } catch (error) {
      next(error);
    }
  });

  // Cancel a recurring contribution
  app.delete("/api/recurring/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const contribution = await storage.getRecurringContributionById(req.params.id);
      
      if (!contribution || contribution.userId !== userId) {
        return res.status(404).json({ message: "Recurring contribution not found or you don't have permission to cancel it" });
      }

      await storage.cancelRecurringContribution(req.params.id);
      res.json({ message: "Recurring contribution cancelled" });
    } catch (error) {
      next(error);
    }
  });

  // Keep backwards compatibility with old route
  app.delete("/api/recurring-contributions/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const contribution = await storage.getRecurringContributionById(req.params.id);
      
      if (!contribution || contribution.userId !== userId) {
        return res.status(404).json({ message: "Recurring contribution not found or you don't have permission to cancel it" });
      }

      await storage.cancelRecurringContribution(req.params.id);
      res.json({ message: "Recurring contribution cancelled" });
    } catch (error) {
      next(error);
    }
  });

  // ========== PLAID BANK LINKING ROUTES ==========

  // Create Plaid link token
  app.post("/api/plaid/link-token", requireAuth, async (req, res, next) => {
    try {
      const { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } = await import('plaid');
      
      const plaidClientId = process.env.PLAID_CLIENT_ID;
      const plaidSecret = process.env.PLAID_SECRET;
      
      if (!plaidClientId || !plaidSecret) {
        return res.status(400).json({ error: "Plaid not configured. Bank linking unavailable." });
      }

      // Use production environment by default, sandbox for testing
      const plaidEnvName = process.env.PLAID_ENV || 'production';
      const plaidEnv = plaidEnvName === 'sandbox' ? PlaidEnvironments.sandbox : 
                       plaidEnvName === 'development' ? PlaidEnvironments.development : 
                       PlaidEnvironments.production;
      
      const configuration = new Configuration({
        basePath: plaidEnv,
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': plaidClientId,
            'PLAID-SECRET': plaidSecret,
          },
        },
      });

      const plaidClient = new PlaidApi(configuration);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Support both Replit and Azure production environments
      let baseUrl = '';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }
      const redirectUri = baseUrl ? `${baseUrl}/security` : undefined;
      
      console.log('[Plaid] Creating link token with:', {
        plaidEnv: plaidEnvName,
        baseUrl,
        redirectUri,
      });
      
      const linkTokenResponse = await plaidClient.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: 'ChipInPool',
        products: [Products.Auth],
        country_codes: [CountryCode.Us],
        language: 'en',
        redirect_uri: plaidEnvName === 'production' && redirectUri ? redirectUri : undefined,
      });

      res.json({ linkToken: linkTokenResponse.data.link_token });
    } catch (error: any) {
      console.error('[Plaid] Link token error:', error.response?.data || error.message);
      const plaidError = error.response?.data;
      if (plaidError?.error_code) {
        return res.status(400).json({ 
          message: plaidError.error_message || 'Plaid error',
          code: plaidError.error_code 
        });
      }
      next(error);
    }
  });

  // Exchange public token for access token and create bank account record
  app.post("/api/plaid/exchange-token", requireAuth, async (req, res, next) => {
    try {
      const { publicToken, accountId, institutionName } = z.object({
        publicToken: z.string(),
        accountId: z.string(),
        institutionName: z.string().optional(),
      }).parse(req.body);

      const { PlaidApi, Configuration, PlaidEnvironments } = await import('plaid');
      
      const plaidClientId = process.env.PLAID_CLIENT_ID;
      const plaidSecret = process.env.PLAID_SECRET;
      
      if (!plaidClientId || !plaidSecret) {
        return res.status(400).json({ error: "Plaid not configured" });
      }

      const plaidEnvName = process.env.PLAID_ENV || 'production';
      const plaidEnv = plaidEnvName === 'sandbox' ? PlaidEnvironments.sandbox : 
                       plaidEnvName === 'development' ? PlaidEnvironments.development : 
                       PlaidEnvironments.production;
      
      const configuration = new Configuration({
        basePath: plaidEnv,
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': plaidClientId,
            'PLAID-SECRET': plaidSecret,
          },
        },
      });

      const plaidClient = new PlaidApi(configuration);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Exchange public token for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      const accessToken = exchangeResponse.data.access_token;

      // Get account and routing numbers via Auth endpoint
      const authResponse = await plaidClient.authGet({
        access_token: accessToken,
      });

      // Find the specific account
      const account = authResponse.data.accounts.find(a => a.account_id === accountId);
      const numbers = authResponse.data.numbers.ach?.find(n => n.account_id === accountId);

      if (!account || !numbers) {
        return res.status(400).json({ error: "Could not retrieve bank account details" });
      }

      // Check if this account is already linked
      const existingAccounts = await storage.getBankAccountsByUser(userId);
      const alreadyLinked = existingAccounts.some(a => a.plaidAccountId === accountId);
      if (alreadyLinked) {
        return res.status(400).json({ error: "This bank account is already linked" });
      }

      const isFirst = existingAccounts.length === 0;

      // Create bank account record with Plaid-verified details
      const bankAccount = await storage.createBankAccount({
        userId,
        plaidAccountId: accountId,
        plaidAccessToken: accessToken,
        institutionName: institutionName || account.official_name || account.name || 'Bank Account',
        accountName: account.name || 'Checking',
        accountMask: account.mask || numbers.account.slice(-4),
        accountType: account.subtype || 'checking',
        isDefault: isFirst,
        routingNumber: numbers.routing,
        accountNumber: numbers.account,
      });

      // Store access token on user for future API calls
      await storage.updateUser(userId, {
        plaidAccessToken: accessToken,
        plaidAccountId: accountId,
      });

      res.json({ 
        message: "Bank account linked successfully via Plaid",
        account: {
          id: bankAccount.id,
          institutionName: bankAccount.institutionName,
          accountMask: bankAccount.accountMask,
          accountType: bankAccount.accountType,
        }
      });
    } catch (error: any) {
      console.error('[Plaid] Token exchange error:', error.response?.data || error.message);
      const plaidError = error.response?.data;
      if (plaidError?.error_code) {
        return res.status(400).json({ 
          error: plaidError.error_message || 'Failed to link bank account',
          code: plaidError.error_code 
        });
      }
      next(error);
    }
  });

  // Get linked bank status
  app.get("/api/plaid/status", requireAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        hasBankLinked: !!user.plaidAccessToken && !!user.plaidAccountId,
      });
    } catch (error) {
      next(error);
    }
  });

  // Initiate withdrawal to bank
  app.post("/api/plaid/withdraw", requireAuth, async (req, res, next) => {
    try {
      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.plaidAccessToken || !user.plaidAccountId) {
        return res.status(400).json({ error: "No bank account linked" });
      }
      if (user.kycStatus !== 'verified') {
        return res.status(400).json({ error: "KYC verification required for withdrawals" });
      }

      const withdrawAmount = parseFloat(amount);
      const currentBalance = parseFloat(user.balance);
      
      if (withdrawAmount <= 0 || withdrawAmount > currentBalance) {
        return res.status(400).json({ error: "Invalid withdrawal amount" });
      }

      // In production, this would initiate a real ACH transfer via Plaid Transfer API
      const newBalance = (currentBalance - withdrawAmount).toFixed(2);
      await storage.updateUser(userId, { balance: newBalance });
      
      // Log the withdrawal
      await storage.createWalletWithdrawal(userId, amount, user.plaidAccountId);

      // Send wallet activity notification - gate with global channel preference AND per-category preference
      sendWalletActivityNotification(
        user.email,
        user.phone,
        user.firstName,
        'withdrawal',
        withdrawAmount.toFixed(2),
        'pending',
        user.notifyEmail && user.emailWalletActivity,
        user.notifySMS && user.smsWalletActivity
      ).catch(console.error);

      res.json({ 
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} initiated. Funds will arrive in 1-3 business days.`,
        newBalance,
      });
    } catch (error) {
      next(error);
    }
  });

  // Wallet withdrawal endpoint - creates pending request for manual admin processing
  app.post("/api/wallet/withdraw", requireAuth, async (req, res, next) => {
    try {
      const { amount, savedMethodId } = z.object({
        amount: z.string(),
        savedMethodId: z.string({ required_error: "Please select a verified bank account" }),
      }).parse(req.body);

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Require KYC verification for withdrawals
      if (user.kycStatus !== 'verified') {
        return res.status(400).json({ error: "Please complete identity verification before withdrawing" });
      }

      const withdrawAmount = parseFloat(amount);
      const currentBalance = parseFloat(user.balance);

      if (withdrawAmount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than zero" });
      }

      if (withdrawAmount < 10) {
        return res.status(400).json({ error: "Minimum withdrawal is $10" });
      }

      if (withdrawAmount > currentBalance) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Get verified bank account
      const savedMethod = await db.select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, savedMethodId))
        .then(rows => rows[0]);
      
      if (!savedMethod || savedMethod.userId !== userId) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      
      // Require Stripe Financial Connections verified account
      if (!savedMethod.stripeFinancialConnectionsAccountId) {
        return res.status(400).json({ error: "Please link a verified bank account via Stripe" });
      }

      const finalRoutingNumber = savedMethod.routingNumber || '';
      const finalAccountNumber = savedMethod.accountNumber || '';
      const finalAccountHolderName = savedMethod.accountName;
      const finalAccountType = savedMethod.accountType;
      const bankAccountIdRef = savedMethod.id;

      // Deduct from user balance immediately
      const newBalance = (currentBalance - withdrawAmount).toFixed(2);
      await storage.updateUser(userId, { balance: newBalance });

      // Create withdrawal request with full bank details
      const accountLast4 = finalAccountNumber.slice(-4);
      const withdrawal = await storage.createWalletWithdrawal(userId, amount, bankAccountIdRef);
      
      // Update withdrawal with complete bank details for admin processing
      await db.update(walletWithdrawals)
        .set({
          status: 'pending_review',
          accountHolderName: finalAccountHolderName,
          routingNumber: finalRoutingNumber,
          accountNumberLast4: accountLast4,
          accountType: finalAccountType,
        })
        .where(eq(walletWithdrawals.id, withdrawal.id));

      console.log(`[Wallet Withdraw] Manual payout request created: ${withdrawal.id} for $${amount}`);
      console.log(`[Wallet Withdraw] Bank: ${finalAccountHolderName}, Routing: ${finalRoutingNumber}, Account: ****${accountLast4}`);

      // Send admin notification email
      const { sendEmail } = await import('./notificationService');
      const adminWithdrawalHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
            <h1 style="color: #d4ff00; margin: 0 0 16px;">💰 New Withdrawal Request</h1>
            <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
              A new withdrawal request requires review.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #94a3b8; margin: 0;">
                <strong>User:</strong> ${user.firstName} ${user.lastName}<br>
                <strong>Email:</strong> ${user.email}<br>
                <strong>Amount:</strong> $${parseFloat(amount).toFixed(2)}<br>
                <strong>Bank:</strong> ${finalAccountHolderName}<br>
                <strong>Account:</strong> ****${accountLast4}<br>
                <strong>Withdrawal ID:</strong> ${withdrawal.id}
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0;">
              Please review this request in the admin portal.
            </p>
          </div>
        </div>
      `;
      
      sendEmail('payments@chipinpool.com', '💰 New Withdrawal Request - Action Required', adminWithdrawalHtml)
        .catch(err => console.error('[Email] Failed to send admin withdrawal notification:', err));

      // Send user notification
      sendWalletActivityNotification(
        user.email,
        user.phone,
        user.firstName,
        'withdrawal',
        amount,
        'pending',
        user.notifyEmail && user.emailWalletActivity,
        user.notifySMS && user.smsWalletActivity
      ).catch(console.error);

      res.json({
        success: true,
        message: `Withdrawal request for $${withdrawAmount.toFixed(2)} submitted. Our team will process it within 1-2 business days.`,
        newBalance,
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      next(error);
    }
  });

  // Get pending withdrawal requests (admin only) - includes full user identity data
  app.get("/api/admin/withdrawals/pending", requireAdmin, async (req: any, res, next) => {
    try {
      const pendingWithdrawals = await db.select()
        .from(walletWithdrawals)
        .where(eq(walletWithdrawals.status, 'pending_review'))
        .orderBy(desc(walletWithdrawals.createdAt));

      // Enrich with full user identity info from KYC verification and full bank account number
      const enrichedWithdrawals = await Promise.all(pendingWithdrawals.map(async (w) => {
        const wUser = await storage.getUser(w.userId);
        
        // Get full bank details from the linked bank account
        let fullAccountNumber: string | null = null;
        let bankRoutingNumber: string | null = null;
        let bankAccountHolderName: string | null = null;
        let bankAccountType: string | null = null;
        if (w.bankAccountId) {
          const bankAccount = await storage.getBankAccountById(w.bankAccountId);
          if (bankAccount) {
            fullAccountNumber = bankAccount.accountNumber || null;
            bankRoutingNumber = bankAccount.routingNumber || null;
            bankAccountHolderName = bankAccount.accountName || null;
            bankAccountType = bankAccount.accountType || null;
          }
        }
        
        return {
          ...w,
          fullAccountNumber,
          routingNumber: w.routingNumber || bankRoutingNumber,
          accountHolderName: w.accountHolderName || bankAccountHolderName,
          accountType: w.accountType || bankAccountType,
          user: wUser ? {
            id: wUser.id,
            firstName: wUser.firstName,
            lastName: wUser.lastName,
            email: wUser.email,
            phone: wUser.phone,
            kycStatus: wUser.kycStatus,
            verifiedLegalName: wUser.verifiedLegalName,
            verifiedAddress: wUser.verifiedAddress,
            verifiedCity: wUser.verifiedCity,
            verifiedState: wUser.verifiedState,
            verifiedPostalCode: wUser.verifiedPostalCode,
            verifiedCountry: wUser.verifiedCountry,
          } : null,
        };
      }));

      res.json({ withdrawals: enrichedWithdrawals });
    } catch (error) {
      next(error);
    }
  });

  // User payout methods - list saved methods
  app.get("/api/payout-methods", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      console.log('[Payout Methods] Fetching for user:', userId);
      
      const methods = await db.select()
        .from(bankAccounts)
        .where(eq(bankAccounts.userId, userId))
        .orderBy(desc(bankAccounts.createdAt));

      console.log('[Payout Methods] Total bank accounts:', methods.length);
      console.log('[Payout Methods] Accounts with FC ID:', methods.filter(m => m.stripeFinancialConnectionsAccountId).length);

      // Only include Stripe Financial Connections verified accounts
      // These have stripeFinancialConnectionsAccountId set
      const verifiedMethods = methods.filter(m => m.stripeFinancialConnectionsAccountId);

      // Mask sensitive data for client
      const maskedMethods = verifiedMethods.map(m => ({
        id: m.id,
        institutionName: m.institutionName,
        accountName: m.accountName,
        accountMask: m.accountMask,
        accountType: m.accountType,
        isDefault: m.isDefault,
        isVerified: true,
        stripeAccountId: m.stripeFinancialConnectionsAccountId,
        createdAt: m.createdAt,
      }));

      console.log('[Payout Methods] Returning:', maskedMethods.length, 'methods');
      res.json({ methods: maskedMethods });
    } catch (error) {
      next(error);
    }
  });

  // Add a new payout method (manual bank account entry)
  app.post("/api/payout-methods", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const { accountHolderName, routingNumber, accountNumber, accountType, institutionName, setAsDefault } = z.object({
        accountHolderName: z.string().min(1),
        routingNumber: z.string().length(9),
        accountNumber: z.string().min(4).max(17),
        accountType: z.enum(['checking', 'savings']),
        institutionName: z.string().min(1),
        setAsDefault: z.boolean().optional().default(false),
      }).parse(req.body);

      // If setting as default, unset other defaults
      if (setAsDefault) {
        await db.update(bankAccounts)
          .set({ isDefault: false })
          .where(eq(bankAccounts.userId, userId));
      }

      const accountLast4 = accountNumber.slice(-4);
      
      const [newMethod] = await db.insert(bankAccounts)
        .values({
          userId,
          institutionName,
          accountName: accountHolderName,
          accountMask: accountLast4,
          accountType,
          routingNumber,
          accountNumber,
          isDefault: setAsDefault,
        })
        .returning();

      res.json({
        success: true,
        method: {
          id: newMethod.id,
          institutionName: newMethod.institutionName,
          accountName: newMethod.accountName,
          accountMask: newMethod.accountMask,
          accountType: newMethod.accountType,
          isDefault: newMethod.isDefault,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete a payout method
  app.delete("/api/payout-methods/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      const method = await db.select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, id))
        .then(rows => rows[0]);

      if (!method || method.userId !== userId) {
        return res.status(404).json({ error: "Payout method not found" });
      }

      await db.delete(bankAccounts).where(eq(bankAccounts.id, id));

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Set a payout method as default
  app.post("/api/payout-methods/:id/set-default", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      const method = await db.select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, id))
        .then(rows => rows[0]);

      if (!method || method.userId !== userId) {
        return res.status(404).json({ error: "Payout method not found" });
      }

      // Unset other defaults
      await db.update(bankAccounts)
        .set({ isDefault: false })
        .where(eq(bankAccounts.userId, userId));

      // Set this one as default
      await db.update(bankAccounts)
        .set({ isDefault: true })
        .where(eq(bankAccounts.id, id));

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Process withdrawal (admin marks as completed after manual Mercury transfer)
  app.post("/api/admin/withdrawals/:id/complete", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { mercuryTransferId, notes } = req.body;

      const withdrawal = await db.select()
        .from(walletWithdrawals)
        .where(eq(walletWithdrawals.id, id))
        .then(rows => rows[0]);

      if (!withdrawal) {
        return res.status(404).json({ error: "Withdrawal not found" });
      }

      if (withdrawal.status !== 'pending_review') {
        return res.status(400).json({ error: "Withdrawal already processed" });
      }

      await db.update(walletWithdrawals)
        .set({
          status: 'completed',
          plaidTransferId: mercuryTransferId || `manual_${Date.now()}`,
          processedAt: new Date(),
          processedBy: req.adminUser.id,
          adminNotes: notes || null,
        })
        .where(eq(walletWithdrawals.id, id));

      // Log admin action
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'process_withdrawal',
        targetType: 'wallet_withdrawal',
        targetId: id,
        details: JSON.stringify({ mercuryTransferId, notes, amount: withdrawal.amount }),
      });

      // Send notification to user
      const withdrawalUser = await storage.getUser(withdrawal.userId);
      if (withdrawalUser) {
        sendWalletActivityNotification(
          withdrawalUser.email,
          withdrawalUser.phone,
          withdrawalUser.firstName || 'User',
          'withdrawal',
          withdrawal.amount,
          'completed',
          withdrawalUser.notifyEmail,
          withdrawalUser.notifySMS
        );
      }

      console.log(`[Admin] Withdrawal ${id} marked as completed by admin ${req.adminUser.id}`);

      res.json({ success: true, message: "Withdrawal marked as completed" });
    } catch (error) {
      next(error);
    }
  });

  // Reject withdrawal and refund balance (admin)
  app.post("/api/admin/withdrawals/:id/reject", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const withdrawal = await db.select()
        .from(walletWithdrawals)
        .where(eq(walletWithdrawals.id, id))
        .then(rows => rows[0]);

      if (!withdrawal) {
        return res.status(404).json({ error: "Withdrawal not found" });
      }

      if (withdrawal.status !== 'pending_review') {
        return res.status(400).json({ error: "Withdrawal already processed" });
      }

      // Refund the user's balance
      const withdrawalUser = await storage.getUser(withdrawal.userId);
      if (withdrawalUser) {
        const currentBalance = parseFloat(withdrawalUser.balance);
        const refundAmount = parseFloat(withdrawal.amount);
        const newBalance = (currentBalance + refundAmount).toFixed(2);
        await storage.updateUser(withdrawal.userId, { balance: newBalance });
      }

      await db.update(walletWithdrawals)
        .set({ 
          status: 'rejected',
          processedAt: new Date(),
          processedBy: req.adminUser.id,
          adminNotes: reason || null,
        })
        .where(eq(walletWithdrawals.id, id));

      // Log admin action
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'reject_withdrawal',
        targetType: 'wallet_withdrawal',
        targetId: id,
        details: JSON.stringify({ reason, amount: withdrawal.amount, refunded: true }),
      });

      // Send notification to user about rejection and refund
      if (withdrawalUser) {
        sendWalletActivityNotification(
          withdrawalUser.email,
          withdrawalUser.phone,
          withdrawalUser.firstName || 'User',
          'withdrawal',
          withdrawal.amount,
          'failed',
          withdrawalUser.notifyEmail,
          withdrawalUser.notifySMS
        );
      }

      console.log(`[Admin] Withdrawal ${id} rejected and refunded by admin ${req.adminUser.id}`);

      res.json({ success: true, message: "Withdrawal rejected and balance refunded" });
    } catch (error) {
      next(error);
    }
  });

  // ========== STRIPE FINANCIAL CONNECTIONS ROUTES ==========

  // Create a Financial Connections session for bank linking via SetupIntent
  app.post("/api/stripe/financial-connections/create-session", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Ensure user has a Stripe customer ID
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId });
      }

      // Create SetupIntent with Financial Connections for bank account linking
      // Force instant verification to ensure Financial Connections is used (no micro-deposits fallback)
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['us_bank_account'],
        payment_method_options: {
          us_bank_account: {
            verification_method: 'instant', // Force instant verification via Financial Connections
            financial_connections: {
              permissions: ['payment_method', 'balances', 'ownership'],
            },
          },
        },
        metadata: { userId: user.id.toString() },
      });
      
      console.log('[Stripe FC] Created SetupIntent:', setupIntent.id);

      res.json({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    } catch (error: any) {
      console.error('[Stripe FC] Session creation error:', error.message);
      next(error);
    }
  });

  // Get payment method details (for retrieving Financial Connections account ID)
  app.get("/api/stripe/payment-method/:paymentMethodId", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { paymentMethodId } = req.params;
      
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      // Return only the necessary fields
      res.json({
        id: paymentMethod.id,
        type: paymentMethod.type,
        us_bank_account: paymentMethod.us_bank_account ? {
          bank_name: paymentMethod.us_bank_account.bank_name,
          last4: paymentMethod.us_bank_account.last4,
          account_type: paymentMethod.us_bank_account.account_type,
          financial_connections_account: paymentMethod.us_bank_account.financial_connections_account,
          routing_number: paymentMethod.us_bank_account.routing_number,
        } : null,
      });
    } catch (error: any) {
      console.error('[Stripe PM] Retrieve error:', error.message);
      next(error);
    }
  });

  // Complete bank linking after user authorizes in Financial Connections
  app.post("/api/stripe/financial-connections/complete", requireAuth, async (req, res, next) => {
    try {
      console.log('[Stripe FC Complete] Request body:', req.body);
      
      const stripe = await getUncachableStripeClient();
      const { accountId, setupIntentId } = z.object({
        accountId: z.string(), // Financial Connections account ID (fca_...)
        setupIntentId: z.string().optional(), // SetupIntent ID to get payment method details
      }).parse(req.body);
      
      console.log('[Stripe FC Complete] Parsed:', { accountId, setupIntentId });

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Retrieve the Financial Connections account
      const fcAccount = await stripe.financialConnections.accounts.retrieve(accountId);
      
      // Validate ownership - ensure the FC account belongs to this user's Stripe customer
      if (user.stripeCustomerId && fcAccount.account_holder) {
        const accountHolder = fcAccount.account_holder as any;
        if (accountHolder.customer && accountHolder.customer !== user.stripeCustomerId) {
          return res.status(403).json({ error: "This account does not belong to you" });
        }
      }

      // Check if already linked
      const existingAccounts = await storage.getBankAccountsByUser(userId);
      const existingAccount = existingAccounts.find(a => a.stripeFinancialConnectionsAccountId === accountId);
      
      // If account exists but doesn't have a payment method, try to update it
      if (existingAccount) {
        // Try to get the payment method from SetupIntent if we don't have one stored
        if (!existingAccount.stripePaymentMethodId && setupIntentId) {
          try {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
              expand: ['payment_method'],
            });
            const paymentMethod = setupIntent.payment_method as any;
            if (paymentMethod?.id) {
              await storage.updateBankAccount(existingAccount.id, { stripePaymentMethodId: paymentMethod.id });
              console.log('[Stripe FC] Updated existing account with payment method:', paymentMethod.id);
              return res.json({ 
                message: "Bank account updated with payment method",
                account: {
                  id: existingAccount.id,
                  institutionName: existingAccount.institutionName,
                  accountMask: existingAccount.accountMask,
                  accountType: existingAccount.accountType,
                  hasPaymentMethod: true,
                }
              });
            }
          } catch (e: any) {
            console.log('[Stripe FC] Could not retrieve payment method for existing account:', e.message);
          }
        }
        return res.status(400).json({ error: "This bank account is already linked" });
      }

      const isFirst = existingAccounts.length === 0;

      // Determine account type
      const accountSubtype = (fcAccount.subcategory as string) || 'checking';
      const isDebitCard = accountSubtype === 'debit' || accountSubtype === 'prepaid';

      // Try to get routing number and payment method from the SetupIntent
      let routingNumber: string | undefined;
      let accountNumber: string | undefined;
      let paymentMethodId: string | undefined;
      
      if (setupIntentId) {
        try {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
            expand: ['payment_method'],
          });
          
          const paymentMethod = setupIntent.payment_method as any;
          if (paymentMethod?.id) {
            paymentMethodId = paymentMethod.id;
            console.log('[Stripe FC] Got payment method ID:', paymentMethodId);
          }
          if (paymentMethod?.us_bank_account) {
            routingNumber = paymentMethod.us_bank_account.routing_number;
            console.log('[Stripe FC] Got routing number from payment method:', routingNumber);
          }
        } catch (e: any) {
          console.log('[Stripe FC] Could not retrieve payment method:', e.message);
        }
      }
      
      // Try to get full account numbers if we have the account_numbers permission
      // First subscribe to the account_numbers feature, then retrieve
      try {
        // Subscribe to account_numbers feature to activate it
        await (stripe.financialConnections.accounts as any).subscribe(accountId, {
          features: ['account_numbers'],
        });
        console.log('[Stripe FC] Subscribed to account_numbers feature');
        
        // Now retrieve the account - account_numbers should be available
        const fcAccountWithNumbers = await stripe.financialConnections.accounts.retrieve(accountId) as any;
        
        // Check if account_numbers are available (only if user granted permission)
        if (fcAccountWithNumbers.account_numbers) {
          routingNumber = fcAccountWithNumbers.account_numbers.routing || routingNumber;
          accountNumber = fcAccountWithNumbers.account_numbers.account;
          console.log('[Stripe FC] Got account numbers from FC:', { 
            hasRouting: !!routingNumber, 
            hasAccount: !!accountNumber,
            accountNumberLength: accountNumber?.length 
          });
        } else {
          console.log('[Stripe FC] account_numbers not available on FC account');
        }
      } catch (e: any) {
        console.log('[Stripe FC] Could not get account numbers:', e.message);
      }

      // Create bank account record with routing/account numbers and payment method if available
      const bankAccount = await storage.createBankAccount({
        userId,
        stripeFinancialConnectionsAccountId: accountId,
        stripePaymentMethodId: paymentMethodId,
        institutionName: fcAccount.institution_name || 'Bank Account',
        accountName: fcAccount.display_name || 'Account',
        accountMask: fcAccount.last4 || '****',
        accountType: accountSubtype,
        payoutMethod: isDebitCard ? 'debit_card' : 'bank_account',
        routingNumber: routingNumber,
        accountNumber: accountNumber,
        isDefault: isFirst,
      });

      console.log('[Stripe FC] Bank account saved:', { 
        id: bankAccount.id, 
        hasRouting: !!routingNumber,
        fcAccountId: accountId 
      });

      res.json({ 
        message: "Bank account linked successfully",
        account: {
          id: bankAccount.id,
          institutionName: bankAccount.institutionName,
          accountMask: bankAccount.accountMask,
          accountType: bankAccount.accountType,
          hasAccountNumber: !!accountNumber,
        }
      });
    } catch (error: any) {
      console.error('[Stripe FC] Complete linking error:', error.message);
      next(error);
    }
  });

  // Sync payment methods for existing bank accounts
  app.post("/api/bank-accounts/sync-payment-methods", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      // Get all bank accounts for the user
      const bankAccounts = await storage.getBankAccountsByUser(userId);
      
      // Get all payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'us_bank_account',
      });

      console.log('[Sync PM] Found', paymentMethods.data.length, 'payment methods for customer');

      let updatedCount = 0;
      for (const bankAccount of bankAccounts) {
        if (bankAccount.stripePaymentMethodId) {
          continue; // Already has a payment method
        }

        // Try to find matching payment method by last4
        const matchingPM = paymentMethods.data.find(pm => 
          pm.us_bank_account?.last4 === bankAccount.accountMask
        );

        if (matchingPM) {
          await storage.updateBankAccount(bankAccount.id, { stripePaymentMethodId: matchingPM.id });
          console.log('[Sync PM] Updated bank account', bankAccount.id, 'with PM:', matchingPM.id);
          updatedCount++;
        }
      }

      res.json({ 
        message: `Synced ${updatedCount} bank account(s) with payment methods`,
        updatedCount,
      });
    } catch (error: any) {
      console.error('[Sync PM] Error:', error.message);
      next(error);
    }
  });

  // Get bank linking status
  app.get("/api/stripe/bank-status", requireAuth, async (req, res, next) => {
    try {
      const accounts = await storage.getBankAccountsByUser(req.session.userId!);
      const hasStripeLinkedAccount = accounts.some(a => a.stripeFinancialConnectionsAccountId);
      
      res.json({
        hasBankLinked: accounts.length > 0,
        hasStripeLinkedAccount,
        accountCount: accounts.length,
      });
    } catch (error) {
      next(error);
    }
  });

  // Retrieve SetupIntent details to get Financial Connections account ID
  app.get("/api/stripe/setup-intent/:setupIntentId", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { setupIntentId } = req.params;
      
      console.log('[Stripe SI] Retrieving SetupIntent:', setupIntentId);
      
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
        expand: ['payment_method'],
      });
      
      console.log('[Stripe SI] SetupIntent status:', setupIntent.status, 'payment_method:', typeof setupIntent.payment_method);
      
      // Verify this belongs to the current user
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId || setupIntent.customer !== user.stripeCustomerId) {
        console.log('[Stripe SI] Unauthorized - user customer:', user?.stripeCustomerId, 'si customer:', setupIntent.customer);
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const paymentMethod = setupIntent.payment_method as any;
      const fcAccountId = paymentMethod?.us_bank_account?.financial_connections_account;
      const routingNumber = paymentMethod?.us_bank_account?.routing_number;
      const last4 = paymentMethod?.us_bank_account?.last4;
      const bankName = paymentMethod?.us_bank_account?.bank_name;
      
      console.log('[Stripe SI] Payment method data:', { 
        hasPaymentMethod: !!paymentMethod, 
        fcAccountId, 
        routingNumber: routingNumber ? '***' : null,
        last4, 
        bankName 
      });
      
      res.json({
        id: setupIntent.id,
        status: setupIntent.status,
        financialConnectionsAccountId: fcAccountId,
        routingNumber,
        last4,
        bankName,
      });
    } catch (error: any) {
      console.error('[Stripe SI] Error:', error.message);
      next(error);
    }
  });

  // Create Stripe Connect Express account for payouts (if needed)
  app.post("/api/stripe/connect/create-account", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if user already has a Connect account
      if (user.stripeConnectId) {
        const account = await stripe.accounts.retrieve(user.stripeConnectId);
        if (account) {
          return res.json({ 
            accountId: user.stripeConnectId,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          });
        }
      }

      // Create Express Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
        },
        metadata: { userId: user.id },
      });

      await storage.updateUser(userId, { stripeConnectId: account.id });

      res.json({ 
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error: any) {
      console.error('[Stripe Connect] Account creation error:', error.message);
      next(error);
    }
  });

  // Create Connect onboarding link
  app.post("/api/stripe/connect/onboarding-link", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.stripeConnectId) {
        return res.status(400).json({ error: "No Connect account. Create one first." });
      }

      // Support both Replit and Azure production environments
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }

      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectId,
        refresh_url: `${baseUrl}/security?refresh=true`,
        return_url: `${baseUrl}/security?success=true`,
        type: 'account_onboarding',
        collection_options: {
          fields: 'eventually_due',
          future_requirements: 'omit',
        },
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error('[Stripe Connect] Onboarding link error:', error.message);
      next(error);
    }
  });

  // Get Connect account status
  app.get("/api/stripe/connect/status", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.stripeConnectId) {
        return res.json({ 
          hasConnectAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      // Validate stripeConnectId format before calling Stripe
      if (!user.stripeConnectId.startsWith('acct_')) {
        console.warn(`Invalid stripeConnectId format for user ${user.id}: ${user.stripeConnectId}`);
        // Clear invalid Connect ID
        await storage.updateUser(user.id, { stripeConnectId: null });
        return res.json({ 
          hasConnectAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      try {
        const account = await stripe.accounts.retrieve(user.stripeConnectId);
        
        res.json({
          hasConnectAccount: true,
          accountId: user.stripeConnectId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });
      } catch (stripeErr: any) {
        // Handle case where Connect account doesn't exist
        if (stripeErr.code === 'resource_missing' || stripeErr.type === 'invalid_request_error') {
          console.warn(`Stripe Connect account not found for user ${user.id}, clearing ID`);
          await storage.updateUser(user.id, { stripeConnectId: null });
          return res.json({ 
            hasConnectAccount: false,
            chargesEnabled: false,
            payoutsEnabled: false,
          });
        }
        throw stripeErr;
      }
    } catch (error) {
      next(error);
    }
  });

  // Reset user's Connect verification (clears stripeConnectId to start fresh)
  app.post("/api/user/reset-verification", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      await storage.updateUser(userId, { stripeConnectId: null });
      res.json({ success: true, message: "Verification reset successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========== POOL TRANSFER ROUTES ==========

  // Get user's linked bank accounts
  app.get("/api/bank-accounts", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      let accounts = await storage.getBankAccountsByUser(userId);
      
      // Auto-sync payment methods for accounts that don't have one
      if (user?.stripeCustomerId) {
        const accountsNeedingSync = accounts.filter(a => !a.stripePaymentMethodId && a.stripeFinancialConnectionsAccountId);
        
        if (accountsNeedingSync.length > 0) {
          try {
            const stripe = await getUncachableStripeClient();
            const paymentMethods = await stripe.paymentMethods.list({
              customer: user.stripeCustomerId,
              type: 'us_bank_account',
            });

            for (const account of accountsNeedingSync) {
              const matchingPM = paymentMethods.data.find(pm => 
                pm.us_bank_account?.last4 === account.accountMask
              );
              if (matchingPM) {
                try {
                  await storage.updateBankAccount(account.id, { stripePaymentMethodId: matchingPM.id });
                  console.log('[Bank Accounts] Auto-synced PM for account:', account.id);
                } catch (updateErr) {
                  console.log('[Bank Accounts] Could not update PM (column may not exist):', account.id);
                }
              } else {
                console.log('[Bank Accounts] No matching PM for mask:', account.accountMask, 'Available PMs:', paymentMethods.data.map(pm => pm.us_bank_account?.last4));
              }
            }
            
            // Refresh accounts after sync
            accounts = await storage.getBankAccountsByUser(userId);
          } catch (e: any) {
            console.log('[Bank Accounts] Auto-sync failed:', e.message);
          }
        }
      }
      
      // Add flag indicating if account can be used for payouts
      // Now supports both Stripe Financial Connections and legacy Plaid
      const accountsWithPayoutStatus = accounts.map(account => ({
        ...account,
        canReceivePayouts: !!(account.stripeFinancialConnectionsAccountId || (account.plaidAccessToken && account.plaidAccountId)),
        hasPaymentMethod: !!account.stripePaymentMethodId,
      }));
      res.json({ accounts: accountsWithPayoutStatus });
    } catch (error) {
      next(error);
    }
  });

  // Debug endpoint to check Stripe payment methods
  app.get("/api/bank-accounts/debug-stripe", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const accounts = await storage.getBankAccountsByUser(userId);
      
      let stripePaymentMethods: any[] = [];
      if (user?.stripeCustomerId) {
        const stripe = await getUncachableStripeClient();
        const pms = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'us_bank_account',
        });
        stripePaymentMethods = pms.data.map(pm => ({
          id: pm.id,
          last4: pm.us_bank_account?.last4,
          bank_name: pm.us_bank_account?.bank_name,
          account_type: pm.us_bank_account?.account_type,
        }));
      }
      
      res.json({
        stripeCustomerId: user?.stripeCustomerId,
        localAccounts: accounts.map(a => ({
          id: a.id,
          mask: a.accountMask,
          institutionName: a.institutionName,
          fcAccountId: a.stripeFinancialConnectionsAccountId,
          paymentMethodId: a.stripePaymentMethodId || null,
        })),
        stripePaymentMethods,
      });
    } catch (error) {
      next(error);
    }
  });

  // Link bank account for payouts (no Connect account needed for regular users)
  // Bank details stored securely - platform processes payouts directly
  app.post("/api/bank-accounts/link", requireAuth, async (req, res, next) => {
    try {
      const { accountHolderName, routingNumber, accountNumber, accountType } = z.object({
        accountHolderName: z.string().min(1),
        routingNumber: z.string().length(9),
        accountNumber: z.string().min(4).max(17),
        accountType: z.enum(['checking', 'savings']),
      }).parse(req.body);

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Get existing accounts to check if this is the first one
      const existingAccounts = await storage.getBankAccountsByUser(userId);
      const isFirst = existingAccounts.length === 0;

      // Store bank account details locally (no Connect account needed for regular users)
      // Platform processes payouts directly from its Stripe balance
      const account = await storage.createBankAccount({
        userId,
        institutionName: 'Bank Account',
        accountName: accountHolderName,
        accountMask: accountNumber.slice(-4),
        accountType,
        isDefault: isFirst,
        routingNumber, // Store for payout processing
        accountNumber, // Store encrypted for payout processing
      });

      res.json({ account, message: "Bank account linked successfully" });
    } catch (error: any) {
      console.error('[Bank Link] Error:', error.message);
      next(error);
    }
  });

  // Link debit card for payouts (stored as bank account with debit type)
  // Accepts Stripe token from frontend card element
  app.post("/api/debit-cards/link", requireAuth, async (req, res, next) => {
    try {
      const { token, cardholderName } = z.object({
        token: z.string().min(1),
        cardholderName: z.string().min(1),
      }).parse(req.body);

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Retrieve token details from Stripe to get card info
      const stripe = await getUncachableStripeClient();
      const stripeToken = await stripe.tokens.retrieve(token);
      if (!stripeToken.card) {
        return res.status(400).json({ error: "Invalid card token" });
      }

      const card = stripeToken.card;
      const cardBrand = card.brand || 'Card';
      const last4 = card.last4 || '****';

      // Get existing accounts to check if this is the first one
      const existingAccounts = await storage.getBankAccountsByUser(userId);
      const isFirst = existingAccounts.length === 0;

      // Store debit card details for display
      const account = await storage.createBankAccount({
        userId,
        institutionName: `${cardBrand} Debit`,
        accountName: cardholderName,
        accountMask: last4,
        accountType: 'debit',
        payoutMethod: 'debit_card',
        isDefault: isFirst,
      });

      res.json({ account, message: "Debit card linked successfully!" });
    } catch (error: any) {
      console.error('[Debit Card Link] Error:', error.message, error);
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ error: error.message || "Invalid card details" });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data" });
      }
      return res.status(500).json({ error: error.message || "Failed to link debit card" });
    }
  });

  // Set default bank account
  app.put("/api/bank-accounts/:id/default", requireAuth, async (req, res, next) => {
    try {
      const accountId = req.params.id;
      const userId = req.session.userId!;
      
      const account = await storage.getBankAccountById(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      await storage.setDefaultBankAccount(userId, accountId);
      res.json({ message: "Default bank account updated" });
    } catch (error) {
      next(error);
    }
  });

  // Delete bank account
  app.delete("/api/bank-accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const accountId = req.params.id;
      const userId = req.session.userId!;
      
      const account = await storage.getBankAccountById(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      await storage.deleteBankAccount(userId, accountId);
      res.json({ message: "Bank account deleted" });
    } catch (error) {
      next(error);
    }
  });

  // Update bank account with full account number for withdrawals
  app.post("/api/bank-accounts/:id/account-number", requireAuth, async (req, res, next) => {
    try {
      const accountId = req.params.id;
      const userId = req.session.userId!;
      
      const { accountNumber } = z.object({
        accountNumber: z.string().min(4).max(17).regex(/^\d+$/, "Account number must be numeric"),
      }).parse(req.body);
      
      const account = await storage.getBankAccountById(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      // Update the account with the full account number
      // Also update accountMask to reflect the new last4
      await db.update(bankAccounts)
        .set({ 
          accountNumber,
          accountMask: accountNumber.slice(-4),
        })
        .where(eq(bankAccounts.id, accountId));
      
      res.json({ success: true, message: "Account number saved" });
    } catch (error) {
      next(error);
    }
  });

  // Get pool contributors for transfer selection
  app.get("/api/pools/:id/contributors", requireAuth, async (req, res, next) => {
    try {
      const poolId = req.params.id;
      const pool = await storage.getPool(poolId);
      
      if (!pool) return res.status(404).json({ error: "Pool not found" });
      if (pool.creatorId !== req.session.userId) {
        return res.status(403).json({ error: "Only pool creator can view contributors for transfer" });
      }

      const contributions = await storage.getContributionsByPool(poolId);
      
      // Get unique contributors with their total contributions
      const contributorMap = new Map<string, { userId: string; totalAmount: number; user?: any }>();
      
      for (const contrib of contributions) {
        if (contrib.userId) {
          const existing = contributorMap.get(contrib.userId);
          const amount = parseFloat(contrib.amount);
          if (existing) {
            existing.totalAmount += amount;
          } else {
            contributorMap.set(contrib.userId, { userId: contrib.userId, totalAmount: amount });
          }
        }
      }

      // Fetch user details for each contributor
      const contributors = [];
      for (const [contributorId, data] of Array.from(contributorMap)) {
        const user = await storage.getUser(contributorId);
        if (user) {
          contributors.push({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            avatar: user.avatar,
            totalContributed: data.totalAmount.toFixed(2),
            hasBankLinked: !!(await storage.getBankAccountsByUser(contributorId)).length,
          });
        }
      }

      res.json({ contributors });
    } catch (error) {
      next(error);
    }
  });

  // Create pool transfer request
  app.post("/api/pools/:id/transfer", requireAuth, async (req, res, next) => {
    try {
      const poolId = req.params.id;
      const userId = req.session.userId!;

      const transferSchema = z.object({
        toUserId: z.string(),
        amount: z.string(),
        notes: z.string().optional(),
        bankAccountId: z.string().optional(),
        payoutSpeed: z.enum(['standard', 'instant']).optional().default('standard'),
      });

      const data = transferSchema.parse(req.body);
      const pool = await storage.getPool(poolId);
      
      if (!pool) return res.status(404).json({ error: "Pool not found" });
      if (pool.creatorId !== userId) {
        return res.status(403).json({ error: "Only pool creator can initiate transfers" });
      }

      const transferAmount = parseFloat(data.amount);
      const poolBalance = parseFloat(pool.currentAmount);
      
      if (transferAmount <= 0 || transferAmount > poolBalance) {
        return res.status(400).json({ error: "Invalid transfer amount" });
      }

      const toUser = await storage.getUser(data.toUserId);
      if (!toUser) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      // If transferring to self, check if bank is linked
      const isSelfTransfer = data.toUserId === userId;
      
      if (isSelfTransfer) {
        const bankAccounts = await storage.getBankAccountsByUser(userId);
        if (bankAccounts.length === 0) {
          return res.status(400).json({ error: "Please link a bank account first" });
        }
        
        // Use specified bank account or default
        const bankAccountId = data.bankAccountId || bankAccounts.find(a => a.isDefault)?.id || bankAccounts[0].id;
        const bankAccount = bankAccounts.find(a => a.id === bankAccountId);

        if (!bankAccount) {
          return res.status(400).json({ error: "Bank account not found" });
        }

        // Calculate fees based on payout speed
        const payoutSpeed = data.payoutSpeed || 'standard';
        const INSTANT_FEE_RATE = 0.015; // 1.5%
        const instantFee = payoutSpeed === 'instant' ? transferAmount * INSTANT_FEE_RATE : 0;
        const netAmount = transferAmount - instantFee;

        // Create transfer request
        const transfer = await storage.createPoolTransferRequest({
          poolId,
          fromUserId: userId,
          toUserId: userId,
          amount: data.amount,
          notes: data.notes,
          bankAccountId,
        });

        // Deduct from pool immediately
        const newPoolAmount = (poolBalance - transferAmount).toFixed(2);
        await storage.updatePoolAmount(poolId, newPoolAmount);

        // Record pool activity for withdrawal
        await storage.createPoolActivity({
          poolId,
          userId,
          type: 'withdrawal',
          amount: data.amount,
          description: `Withdrew to bank account`,
          referenceId: transfer.id,
        });
        
        // Update pool spent amount
        const currentSpent = parseFloat(pool.spentAmount);
        const newSpentAmount = (currentSpent + transferAmount).toFixed(2);
        await storage.updatePoolSpentAmount(poolId, newSpentAmount);

        // Create wallet withdrawal record
        const withdrawal = await storage.createWalletWithdrawal(
          userId,
          netAmount.toFixed(2),
          bankAccountId,
          payoutSpeed,
          instantFee > 0 ? instantFee.toFixed(2) : undefined
        );

        // Save bank details on withdrawal for admin processing
        await db.update(walletWithdrawals)
          .set({
            accountHolderName: bankAccount.accountName,
            routingNumber: bankAccount.routingNumber || null,
            accountNumberLast4: bankAccount.accountNumber ? bankAccount.accountNumber.slice(-4) : bankAccount.accountMask,
            accountType: bankAccount.accountType,
          })
          .where(eq(walletWithdrawals.id, withdrawal.id));

        // Execute payout - Stripe for new accounts, Plaid for legacy
        let payoutTransferId: string | null = null;
        let payoutError: string | null = null;
        const creator = await storage.getUser(userId);
        
        // Check if this is a Stripe-linked account (Financial Connections)
        const isStripeLinked = !!bankAccount.stripeFinancialConnectionsAccountId;
        
        if (isStripeLinked) {
          // Stripe Financial Connections linked accounts
          // Route to manual admin processing (Mercury/Plaid Transfer)
          try {
            console.log('[Payout] Stripe FC-linked bank account, routing to admin review');
            console.log('[Payout] Bank:', bankAccount.institutionName, '****' + bankAccount.accountMask);
            
            payoutTransferId = `manual_${withdrawal.id}`;
            await storage.updateWalletWithdrawal(withdrawal.id, {
              plaidTransferId: payoutTransferId,
              status: 'pending_review',
            });
            
          } catch (stripeError: any) {
            console.error('[Payout] Stripe Transfer error:', stripeError.message);
            payoutError = stripeError.message || 'Payout failed';
            await storage.updateWalletWithdrawalStatus(withdrawal.id, 'failed');
          }
        } else {
          // Legacy: Use Plaid Transfer for older accounts
          try {
            const { PlaidApi, Configuration, PlaidEnvironments, TransferType, TransferNetwork, ACHClass } = await import('plaid');
            
            const plaidClientId = process.env.PLAID_CLIENT_ID;
            const plaidSecret = process.env.PLAID_SECRET;
            
            if (!plaidClientId || !plaidSecret) {
              throw new Error('Please link your bank account using the new method in Security settings.');
            }

            const plaidEnvName = process.env.PLAID_ENV || 'production';
            const plaidEnv = plaidEnvName === 'sandbox' ? PlaidEnvironments.sandbox : 
                             plaidEnvName === 'development' ? PlaidEnvironments.development : 
                             PlaidEnvironments.production;
            
            const configuration = new Configuration({
              basePath: plaidEnv,
              baseOptions: {
                headers: {
                  'PLAID-CLIENT-ID': plaidClientId,
                  'PLAID-SECRET': plaidSecret,
                },
              },
            });

            const plaidClient = new PlaidApi(configuration);
            
            const plaidAccessToken = bankAccount.plaidAccessToken || creator?.plaidAccessToken;
            const plaidAccountId = bankAccount.plaidAccountId || creator?.plaidAccountId;
            
            if (!plaidAccessToken || !plaidAccountId) {
              throw new Error('Bank account is not properly linked. Please re-link in Security settings.');
            }

            const transferNetwork = payoutSpeed === 'instant' ? TransferNetwork.Rtp : TransferNetwork.Ach;

            const authRequest: any = {
              access_token: plaidAccessToken,
              account_id: plaidAccountId,
              type: TransferType.Credit,
              network: transferNetwork,
              amount: netAmount.toFixed(2),
              user: {
                legal_name: `${creator?.firstName || 'User'} ${creator?.lastName || ''}`,
              },
            };

            if (payoutSpeed === 'standard') {
              authRequest.ach_class = ACHClass.Ppd;
            }

            const authResponse = await plaidClient.transferAuthorizationCreate(authRequest);
            const authorization = authResponse.data.authorization;
            
            if (authorization.decision !== 'approved') {
              const rationale = authorization.decision_rationale;
              const rationaleCode = rationale?.code as string | undefined;
              if (payoutSpeed === 'instant' && (rationaleCode === 'RTP_NOT_SUPPORTED' || rationale?.description?.toLowerCase().includes('rtp'))) {
                const rtpError: any = new Error('Instant payout not available for this bank');
                rtpError.code = 'RTP_NOT_SUPPORTED';
                throw rtpError;
              }
              throw new Error(`Transfer not approved: ${rationale?.description || 'Unknown reason'}`);
            }

            const transferReq: any = {
              authorization_id: authorization.id,
              access_token: plaidAccessToken,
              account_id: plaidAccountId,
              type: TransferType.Credit,
              network: transferNetwork,
              amount: netAmount.toFixed(2),
              description: `ChipIn Pool Withdrawal${payoutSpeed === 'instant' ? ' (Instant)' : ''}`,
              user: {
                legal_name: `${creator?.firstName || 'User'} ${creator?.lastName || ''}`,
              },
            };

            if (payoutSpeed === 'standard') {
              transferReq.ach_class = ACHClass.Ppd;
            }

            const transferResponse = await plaidClient.transferCreate(transferReq);
            payoutTransferId = transferResponse.data.transfer.id;
            
            await storage.updateWalletWithdrawal(withdrawal.id, {
              plaidTransferId: payoutTransferId,
              status: 'pending',
            });

          } catch (plaidError: any) {
            console.error('[Payout] Plaid Transfer error:', plaidError.response?.data || plaidError.message);
            payoutError = plaidError.response?.data?.error_message || plaidError.message || 'Payout failed';
            
            await storage.updateWalletWithdrawalStatus(withdrawal.id, 'failed');
            
            if (plaidError.code === 'RTP_NOT_SUPPORTED') {
              await storage.updatePoolAmount(poolId, poolBalance.toFixed(2));
              await storage.updatePoolTransferRequest(transfer.id, { status: 'pending' });
              return res.status(400).json({ 
                error: 'Instant payout not available for this bank. Please use standard payout.',
                code: 'RTP_NOT_SUPPORTED'
              });
            }
          }
        }

        // Handle payout failure
        if (payoutError) {
          await storage.updatePoolAmount(poolId, poolBalance.toFixed(2));
          await storage.updatePoolTransferRequest(transfer.id, { status: 'failed' });
          return res.status(500).json({ 
            error: `Payout failed: ${payoutError}. Pool balance has been restored.`
          });
        }

        // Mark as accepted
        await storage.updatePoolTransferRequest(transfer.id, {
          status: 'accepted',
          acceptedAt: new Date(),
        });

        // Create notification
        const speedDescription = payoutSpeed === 'instant' ? 'arriving instantly' : 'arriving in 1-3 business days';
        const feeNote = instantFee > 0 ? ` (1.5% instant fee: $${instantFee.toFixed(2)})` : '';
        await storage.createNotification({
          userId,
          type: 'contribution',
          title: payoutSpeed === 'instant' ? 'Instant Payout Processing' : 'Withdrawal Initiated',
          message: `Your ${payoutSpeed} payout of $${netAmount.toFixed(2)}${feeNote} to ${bankAccount.institutionName} ****${bankAccount.accountMask} is ${speedDescription}.`,
          link: `/transactions`,
        });

        const eta = payoutSpeed === 'instant' ? 'instantly' : '1-3 business days';
        res.json({ 
          transfer,
          payoutSpeed,
          grossAmount: transferAmount.toFixed(2),
          fee: instantFee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          eta,
          message: `${payoutSpeed === 'instant' ? 'Instant payout' : 'Withdrawal'} of $${netAmount.toFixed(2)} initiated to ${bankAccount.institutionName} ****${bankAccount.accountMask}. Funds ${payoutSpeed === 'instant' ? 'arriving instantly' : 'will arrive in 1-3 business days'}.`,
        });
      } else {
        // Transfer to contributor - create pending request
        const transfer = await storage.createPoolTransferRequest({
          poolId,
          fromUserId: userId,
          toUserId: data.toUserId,
          amount: data.amount,
          notes: data.notes,
        });

        // Create notification for recipient
        await storage.createNotification({
          userId: data.toUserId,
          type: 'contribution',
          title: 'Transfer Request',
          message: `You have a pending transfer of $${transferAmount.toFixed(2)} from the pool "${pool.title}". Tap to accept.`,
          link: `/transfer/${transfer.id}/accept`,
        });

        // Send notification via email/SMS if enabled
        const senderUser = await storage.getUser(userId);
        if (toUser.notifyEmail) {
          sendPoolInviteNotification(
            toUser.email,
            toUser.phone,
            senderUser?.firstName || 'Pool Creator',
            pool.id,
            `${pool.title} - Transfer Request: $${transferAmount.toFixed(2)}`,
            true,
            false
          ).catch(console.error);
        }

        res.json({ 
          transfer,
          message: `Transfer request sent to ${toUser.firstName}. They will be notified to accept.`,
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Get pending transfer requests for current user
  app.get("/api/transfer-requests/pending", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const requests = await storage.getPendingTransferRequestsForUser(userId);
      
      // Enrich with pool and sender details
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const pool = await storage.getPool(request.poolId);
        const sender = await storage.getUser(request.fromUserId);
        return {
          ...request,
          pool: pool ? { id: pool.id, title: pool.title } : null,
          sender: sender ? { 
            id: sender.id, 
            firstName: sender.firstName, 
            lastName: sender.lastName,
            avatar: sender.avatar 
          } : null,
        };
      }));

      res.json({ requests: enrichedRequests });
    } catch (error) {
      next(error);
    }
  });

  // Get single transfer request
  app.get("/api/transfer-requests/:id", requireAuth, async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;

      const transferRequest = await storage.getPoolTransferRequest(requestId);
      if (!transferRequest) {
        return res.status(404).json({ error: "Transfer request not found" });
      }
      
      // Only sender or recipient can view
      if (transferRequest.fromUserId !== userId && transferRequest.toUserId !== userId) {
        return res.status(403).json({ error: "You don't have permission to view this transfer" });
      }

      // Enrich with pool and sender details
      const pool = await storage.getPool(transferRequest.poolId);
      const sender = await storage.getUser(transferRequest.fromUserId);
      
      res.json({
        request: {
          ...transferRequest,
          poolName: pool?.title || 'Unknown Pool',
          fromUserName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User',
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Accept transfer request
  app.post("/api/transfer-requests/:id/accept", requireAuth, async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;

      const { bankAccountId, payoutSpeed } = z.object({
        bankAccountId: z.string(),
        payoutSpeed: z.enum(['standard', 'instant']).default('standard'),
      }).parse(req.body);

      const transferRequest = await storage.getPoolTransferRequest(requestId);
      if (!transferRequest) {
        return res.status(404).json({ error: "Transfer request not found" });
      }
      if (transferRequest.toUserId !== userId) {
        return res.status(403).json({ error: "This transfer is not for you" });
      }
      if (transferRequest.status !== 'pending') {
        return res.status(400).json({ error: "Transfer already processed" });
      }

      // Verify bank account belongs to user
      const bankAccount = await storage.getBankAccountById(bankAccountId);
      if (!bankAccount || bankAccount.userId !== userId) {
        return res.status(400).json({ error: "Invalid bank account" });
      }

      // Verify pool still has sufficient funds
      const pool = await storage.getPool(transferRequest.poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      const transferAmount = parseFloat(transferRequest.amount);
      const poolBalance = parseFloat(pool.currentAmount);

      // Calculate instant payout fee (1.5% for instant, free for standard)
      const INSTANT_FEE_RATE = 0.015; // 1.5%
      const instantFee = payoutSpeed === 'instant' ? transferAmount * INSTANT_FEE_RATE : 0;
      const netAmount = transferAmount - instantFee;

      if (transferAmount > poolBalance) {
        await storage.updatePoolTransferRequest(requestId, { status: 'failed' });
        return res.status(400).json({ error: "Pool no longer has sufficient funds" });
      }

      // Get recipient user
      const recipient = await storage.getUser(userId);
      if (!recipient) {
        return res.status(404).json({ error: "User not found" });
      }

      // Deduct from pool first
      const newPoolAmount = (poolBalance - transferAmount).toFixed(2);
      await storage.updatePoolAmount(transferRequest.poolId, newPoolAmount);

      // Record pool activity for transfer to user
      const sender = await storage.getUser(transferRequest.fromUserId);
      await storage.createPoolActivity({
        poolId: transferRequest.poolId,
        userId: transferRequest.fromUserId,
        type: 'transfer',
        amount: transferRequest.amount,
        description: `Sent to ${recipient?.firstName || 'user'} ${recipient?.lastName || ''}`.trim(),
        referenceId: requestId,
      });
      
      // Update pool spent amount
      const poolForSpent = await storage.getPool(transferRequest.poolId);
      if (poolForSpent) {
        const currentSpent = parseFloat(poolForSpent.spentAmount);
        const newSpentAmount = (currentSpent + transferAmount).toFixed(2);
        await storage.updatePoolSpentAmount(transferRequest.poolId, newSpentAmount);
      }

      // Create wallet withdrawal record to track the payout
      const withdrawal = await storage.createWalletWithdrawal(
        userId,
        netAmount.toFixed(2),
        bankAccountId,
        payoutSpeed,
        instantFee > 0 ? instantFee.toFixed(2) : undefined
      );

      // Save bank details on withdrawal for admin processing
      await db.update(walletWithdrawals)
        .set({
          accountHolderName: bankAccount.accountName,
          routingNumber: bankAccount.routingNumber || null,
          accountNumberLast4: bankAccount.accountNumber ? bankAccount.accountNumber.slice(-4) : bankAccount.accountMask,
          accountType: bankAccount.accountType,
        })
        .where(eq(walletWithdrawals.id, withdrawal.id));

      // Execute payout - Stripe for new accounts, Plaid for legacy
      let plaidTransferId: string | null = null;
      let payoutError: string | null = null;
      
      // Check if this is a Stripe-linked account (Financial Connections)
      const isStripeLinked = !!bankAccount.stripeFinancialConnectionsAccountId;
      
      if (isStripeLinked) {
        // For Stripe-linked accounts
        try {
          const stripe = await getUncachableStripeClient();
          
          // Check if user has a Connect account (optional for enhanced payouts)
          if (recipient?.stripeConnectId) {
            const connectAccount = await stripe.accounts.retrieve(recipient.stripeConnectId);
            if (connectAccount.payouts_enabled) {
              const stripeTransfer = await stripe.transfers.create({
                amount: Math.round(netAmount * 100),
                currency: 'usd',
                destination: recipient.stripeConnectId,
                description: `ChipIn Pool Transfer${payoutSpeed === 'instant' ? ' (Instant)' : ''}`,
                metadata: {
                  transferRequestId: requestId,
                  poolId: transferRequest.poolId,
                  payoutSpeed,
                },
              });
              
              plaidTransferId = stripeTransfer.id;
              
              if (payoutSpeed === 'instant') {
                try {
                  await stripe.payouts.create({
                    amount: Math.round(netAmount * 100),
                    currency: 'usd',
                    method: 'instant',
                  }, {
                    stripeAccount: recipient.stripeConnectId,
                  });
                } catch (instantError: any) {
                  console.log('[Transfer] Instant payout not available:', instantError.message);
                }
              }
            } else {
              throw new Error('Payout account not ready');
            }
          } else {
            // Regular user without Connect - mark for platform-managed payout
            if (!bankAccount.routingNumber || !bankAccount.accountNumber) {
              throw new Error('Bank account details not available. Please re-link your bank account.');
            }
            
            console.log('[Transfer] Marked for platform-managed ACH payout to:', bankAccount.accountMask);
            plaidTransferId = `manual_transfer_${requestId}`;
          }
          
          await storage.updateWalletWithdrawal(withdrawal.id, {
            plaidTransferId: plaidTransferId,
            status: 'pending',
          });
          
        } catch (stripeError: any) {
          console.error('[Transfer] Stripe error:', stripeError.message);
          payoutError = stripeError.message || 'Transfer failed';
          await storage.updateWalletWithdrawalStatus(withdrawal.id, 'failed');
          await storage.updatePoolTransferRequest(requestId, { status: 'failed' });
          return res.status(400).json({ error: payoutError });
        }
      } else {
        // Legacy: Use Plaid Transfer for older accounts
        try {
          const { PlaidApi, Configuration, PlaidEnvironments, TransferType, TransferNetwork, ACHClass } = await import('plaid');
          
          const plaidClientId = process.env.PLAID_CLIENT_ID;
          const plaidSecret = process.env.PLAID_SECRET;
          
          if (!plaidClientId || !plaidSecret) {
            throw new Error('Plaid not configured for payouts');
          }

          const plaidEnvName = process.env.PLAID_ENV || 'production';
          const plaidEnv = plaidEnvName === 'sandbox' ? PlaidEnvironments.sandbox : 
                           plaidEnvName === 'development' ? PlaidEnvironments.development : 
                           PlaidEnvironments.production;
          
          const configuration = new Configuration({
            basePath: plaidEnv,
            baseOptions: {
              headers: {
                'PLAID-CLIENT-ID': plaidClientId,
                'PLAID-SECRET': plaidSecret,
              },
            },
          });

          const plaidClient = new PlaidApi(configuration);

          // Validate bank account has required Plaid data for transfers
          const plaidAccessToken = bankAccount.plaidAccessToken || recipient.plaidAccessToken;
          const plaidAccountId = bankAccount.plaidAccountId || recipient.plaidAccountId;
          
          if (!plaidAccessToken || !plaidAccountId) {
            throw new Error('Bank account is not properly linked via Plaid for payouts. Please re-link your bank account.');
          }

        // Determine network based on payout speed
        // Instant: Use RTP (Real-Time Payments) - instant but requires bank support
        // Standard: Use ACH - 1-3 business days but works with all banks
        const transferNetwork = payoutSpeed === 'instant' ? TransferNetwork.Rtp : TransferNetwork.Ach;

        // Create transfer authorization first
        const authRequest: any = {
          access_token: plaidAccessToken,
          account_id: plaidAccountId,
          type: TransferType.Credit, // Credit = send money TO user's bank
          network: transferNetwork,
          amount: netAmount.toFixed(2),
          user: {
            legal_name: `${recipient.firstName} ${recipient.lastName}`,
          },
        };

        // ACH requires ach_class, RTP does not
        if (payoutSpeed === 'standard') {
          authRequest.ach_class = ACHClass.Ppd;
        }

        const authResponse = await plaidClient.transferAuthorizationCreate(authRequest);

        const authorization = authResponse.data.authorization;
        
        if (authorization.decision !== 'approved') {
          // If RTP fails, it might be because bank doesn't support it
          const rationale = authorization.decision_rationale;
          const rationaleCode = rationale?.code as string | undefined;
          if (payoutSpeed === 'instant' && (rationaleCode === 'RTP_NOT_SUPPORTED' || rationale?.description?.toLowerCase().includes('rtp'))) {
            const rtpError: any = new Error('Instant payout not available for this bank. Please use standard payout instead.');
            rtpError.code = 'RTP_NOT_SUPPORTED';
            throw rtpError;
          }
          throw new Error(`Transfer not approved: ${rationale?.description || 'Unknown reason'}`);
        }

        // Create the actual transfer
        const transferRequest: any = {
          authorization_id: authorization.id,
          access_token: plaidAccessToken,
          account_id: plaidAccountId,
          type: TransferType.Credit,
          network: transferNetwork,
          amount: netAmount.toFixed(2),
          description: `ChipIn Pool Withdrawal${payoutSpeed === 'instant' ? ' (Instant)' : ''}`,
          user: {
            legal_name: `${recipient.firstName} ${recipient.lastName}`,
          },
        };

        if (payoutSpeed === 'standard') {
          transferRequest.ach_class = ACHClass.Ppd;
        }

        const transferResponse = await plaidClient.transferCreate(transferRequest);

        plaidTransferId = transferResponse.data.transfer.id;
        console.log(`[Payout] Plaid Transfer created: ${plaidTransferId} for $${netAmount.toFixed(2)} to user ${userId}`);

        // Update withdrawal with Plaid transfer ID
        await storage.updateWalletWithdrawal(withdrawal.id, {
          plaidTransferId,
          status: 'pending', // Will be updated via webhook when transfer completes
        });

      } catch (plaidError: any) {
        console.error('[Payout] Plaid Transfer error:', plaidError.response?.data || plaidError.message);
        payoutError = plaidError.response?.data?.error_message || plaidError.message || 'Payout failed';
        
        // Mark withdrawal as failed
        await storage.updateWalletWithdrawalStatus(withdrawal.id, 'failed');
        
        // Check if this is an RTP not supported error
        if (plaidError.code === 'RTP_NOT_SUPPORTED') {
          // Refund pool and return specific error
          const refundedAmount = (parseFloat(newPoolAmount) + transferAmount).toFixed(2);
          await storage.updatePoolAmount(transferRequest.poolId, refundedAmount);
          
          await storage.updatePoolTransferRequest(requestId, {
            status: 'pending', // Keep pending so user can try again with standard
            bankAccountId: null,
          });
          
          return res.status(400).json({ 
            error: 'Instant payout not available for this bank. Please use standard payout instead.',
            code: 'RTP_NOT_SUPPORTED'
          });
        }
        } // End Plaid try-catch
      } // End else block for Plaid

      // Handle payout failure - refund pool
      if (payoutError) {
        const refundedAmount = (parseFloat(newPoolAmount) + transferAmount).toFixed(2);
        await storage.updatePoolAmount(transferRequest.poolId, refundedAmount);
        
        await storage.updatePoolTransferRequest(requestId, {
          status: 'failed',
          bankAccountId,
        });
        
        return res.status(500).json({ 
          error: `Payout failed: ${payoutError}. Pool balance has been restored.` 
        });
      }

      // Update transfer request status
      await storage.updatePoolTransferRequest(requestId, {
        status: 'accepted',
        bankAccountId,
        acceptedAt: new Date(),
      });

      // Create notification for recipient about pending payout
      const speedDescription = payoutSpeed === 'instant' ? 'arriving instantly' : 'arriving in 1-3 business days';
      const feeNote = instantFee > 0 ? ` (${INSTANT_FEE_RATE * 100}% instant fee: $${instantFee.toFixed(2)})` : '';
      await storage.createNotification({
        userId,
        type: 'contribution',
        title: payoutSpeed === 'instant' ? 'Instant Payout Processing' : 'Withdrawal Pending',
        message: `Your ${payoutSpeed} payout of $${netAmount.toFixed(2)}${feeNote} to ${bankAccount.institutionName} ****${bankAccount.accountMask} is ${speedDescription}.`,
        link: `/transactions`,
      });

      // Notify pool creator
      const creator = await storage.getUser(transferRequest.fromUserId);
      
      if (creator) {
        await storage.createNotification({
          userId: creator.id,
          type: 'contribution',
          title: 'Transfer Accepted',
          message: `${recipient.firstName} accepted the transfer of $${transferAmount.toFixed(2)}`,
          link: `/pool/${transferRequest.poolId}`,
        });
      }

      // Send wallet activity notification
      const { sendWalletActivityNotification } = await import('./notificationService');
      sendWalletActivityNotification(
        recipient.email,
        recipient.phone,
        recipient.firstName,
        'withdrawal',
        netAmount.toFixed(2),
        'pending',
        recipient.notifyEmail && recipient.emailWalletActivity,
        recipient.notifySMS && recipient.smsWalletActivity
      ).catch(console.error);

      res.json({ 
        message: `Transfer accepted! Your withdrawal of $${netAmount.toFixed(2)} is now pending. You'll be notified when the transfer completes.`,
        status: 'pending',
        amount: transferAmount.toFixed(2),
        fee: '0.00',
        netAmount: netAmount.toFixed(2),
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      next(error);
    }
  });

  // Decline transfer request
  app.post("/api/transfer-requests/:id/decline", requireAuth, async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;

      const transferRequest = await storage.getPoolTransferRequest(requestId);
      if (!transferRequest) {
        return res.status(404).json({ error: "Transfer request not found" });
      }
      if (transferRequest.toUserId !== userId) {
        return res.status(403).json({ error: "This transfer is not for you" });
      }
      if (transferRequest.status !== 'pending') {
        return res.status(400).json({ error: "Transfer already processed" });
      }

      await storage.updatePoolTransferRequest(requestId, {
        status: 'cancelled',
      });

      // Notify pool creator
      const creator = await storage.getUser(transferRequest.fromUserId);
      const recipient = await storage.getUser(userId);
      
      if (creator) {
        await storage.createNotification({
          userId: creator.id,
          type: 'contribution',
          title: 'Transfer Declined',
          message: `${recipient?.firstName || 'Contributor'} declined the transfer of $${parseFloat(transferRequest.amount).toFixed(2)}`,
          link: `/pool/${transferRequest.poolId}`,
        });
      }

      res.json({ message: "Transfer declined" });
    } catch (error) {
      next(error);
    }
  });

  // Cancel transfer request (by pool creator)
  app.post("/api/transfer-requests/:id/cancel", requireAuth, async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;

      const transferRequest = await storage.getPoolTransferRequest(requestId);
      if (!transferRequest) {
        return res.status(404).json({ error: "Transfer request not found" });
      }
      if (transferRequest.fromUserId !== userId) {
        return res.status(403).json({ error: "Only the sender can cancel this transfer" });
      }
      if (transferRequest.status !== 'pending') {
        return res.status(400).json({ error: "Transfer already processed" });
      }

      await storage.updatePoolTransferRequest(requestId, {
        status: 'cancelled',
      });

      res.json({ message: "Transfer cancelled" });
    } catch (error) {
      next(error);
    }
  });

  // ========== SECURITY ROUTES ==========

  // Send email verification code
  app.post("/api/security/email/send", requireAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.emailVerified) return res.status(400).json({ error: "Email already verified" });

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await storage.createVerificationCode({ userId: user.id, type: 'email', code, expiresAt });

      // Send via notification service
      const sent = await sendVerificationEmail(user.email, code);
      if (!sent) {
        console.log(`[DEV] Email verification code for ${user.email}: ${code}`);
      }

      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      next(error);
    }
  });

  // Verify email code
  app.post("/api/security/email/verify", requireAuth, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      const userId = req.session.userId!;

      const verificationCode = await storage.getValidVerificationCode(userId, 'email', code);
      if (!verificationCode) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      await storage.markVerificationCodeUsed(verificationCode.id);
      await storage.updateUser(userId, { emailVerified: true });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Send phone verification code
  app.post("/api/security/phone/send", requireAuth, async (req, res, next) => {
    try {
      const { phone } = z.object({ phone: z.string().min(10) }).parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      await storage.updateUser(userId, { phone });

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await storage.createVerificationCode({ userId, type: 'phone', code, expiresAt });

      // Send via notification service
      const sent = await sendVerificationSMS(phone, code);
      if (!sent) {
        console.log(`[DEV] Phone verification code for ${phone}: ${code}`);
      }

      res.json({ message: "Verification code sent to your phone" });
    } catch (error) {
      next(error);
    }
  });

  // Verify phone code
  app.post("/api/security/phone/verify", requireAuth, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      const userId = req.session.userId!;

      const verificationCode = await storage.getValidVerificationCode(userId, 'phone', code);
      if (!verificationCode) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      await storage.markVerificationCodeUsed(verificationCode.id);
      await storage.updateUser(userId, { phoneVerified: true });

      res.json({ message: "Phone verified successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Set transaction PIN
  app.post("/api/security/pin/set", requireAuth, async (req, res, next) => {
    try {
      const { pin } = z.object({ pin: z.string().length(4).regex(/^\d+$/) }).parse(req.body);
      const userId = req.session.userId!;

      const hashedPin = await hashTransactionPin(pin);
      await storage.updateUser(userId, { transactionPin: hashedPin });

      res.json({ message: "Transaction PIN set successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Verify transaction PIN
  app.post("/api/security/pin/verify", requireAuth, async (req, res, next) => {
    try {
      const { pin } = z.object({ pin: z.string().length(4) }).parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user || !user.transactionPin) {
        return res.status(400).json({ error: "No PIN set" });
      }

      const isValid = await verifyTransactionPin(pin, user.transactionPin);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid PIN" });
      }

      res.json({ valid: true });
    } catch (error) {
      next(error);
    }
  });

  // Enable 2FA - get QR code
  app.post("/api/security/2fa/setup", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.twoFactorEnabled) return res.status(400).json({ error: "2FA already enabled" });

      const { secret, otpauthUrl } = generate2FASecret(user.email);
      const qrCode = await generate2FAQRCode(otpauthUrl);

      await storage.updateUser(userId, { twoFactorSecret: secret });

      res.json({ qrCode, secret });
    } catch (error) {
      next(error);
    }
  });

  // Confirm 2FA with code
  app.post("/api/security/2fa/enable", requireAuth, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA not set up" });
      }

      const isValid = verify2FAToken(user.twoFactorSecret, code);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid code" });
      }

      await storage.updateUser(userId, { twoFactorEnabled: true });

      // Send security alert notification - gate with global channel preference AND per-category preference
      sendSecurityAlertNotification(
        user.email,
        user.phone,
        user.firstName,
        '2fa_enabled',
        'Two-factor authentication has been enabled on your account. Your account is now more secure.',
        user.notifyEmail && user.emailSecurityAlerts,
        user.notifySMS && user.smsSecurityAlerts
      ).catch(console.error);

      res.json({ message: "2FA enabled successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Disable 2FA
  app.post("/api/security/2fa/disable", requireAuth, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA not enabled" });
      }

      const isValid = verify2FAToken(user.twoFactorSecret, code);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid code" });
      }

      await storage.updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null });

      // Send security alert notification - gate with global channel preference AND per-category preference
      sendSecurityAlertNotification(
        user.email,
        user.phone,
        user.firstName,
        '2fa_disabled',
        'Two-factor authentication has been disabled on your account. Consider re-enabling it for better security.',
        user.notifyEmail && user.emailSecurityAlerts,
        user.notifySMS && user.smsSecurityAlerts
      ).catch(console.error);

      res.json({ message: "2FA disabled successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Initiate KYC with Stripe Identity
  app.post("/api/security/kyc/start", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.kycStatus === 'verified') return res.status(400).json({ error: "Already verified" });

      const stripe = await getUncachableStripeClient();
      
      // Support both Replit and Azure production environments
      // Use request host as the most reliable fallback for production
      const host = req.get('host');
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      let baseUrl = host ? `${protocol}://${host}` : 'http://localhost:5000';
      
      // Override with explicit environment variables if set
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      }
      
      console.log('Stripe Identity baseUrl:', baseUrl, '| host:', host, '| WEBSITE_HOSTNAME:', process.env.WEBSITE_HOSTNAME);
      
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: { userId },
        options: {
          document: {
            require_matching_selfie: true,
          },
        },
        return_url: `${baseUrl}/`,
      });

      console.log('Stripe verification session created:', {
        id: verificationSession.id,
        url: verificationSession.url,
        status: verificationSession.status,
      });

      await storage.updateUser(userId, { kycStatus: 'pending' });

      res.json({ 
        clientSecret: verificationSession.client_secret,
        url: verificationSession.url,
      });
    } catch (error) {
      next(error);
    }
  });

  // Refresh KYC status from Stripe (check if verification completed)
  app.post("/api/security/kyc/refresh", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.kycStatus === 'verified') {
        return res.json({ status: 'verified', message: "Already verified" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Find verification sessions for this user
      const sessions = await stripe.identity.verificationSessions.list({
        limit: 10,
      });
      
      const userSession = sessions.data.find(s => s.metadata?.userId === userId);
      
      if (!userSession) {
        return res.json({ status: user.kycStatus, message: "No verification session found" });
      }
      
      console.log('[KYC Refresh] Session status:', userSession.status, 'for user:', userId);
      
      if (userSession.status === 'verified') {
        // Retrieve full session with expanded verified_outputs to get address
        const fullSession = await stripe.identity.verificationSessions.retrieve(userSession.id, {
          expand: ['verified_outputs'],
        }) as any;
        
        const verifiedOutputs = fullSession.verified_outputs;
        console.log('[KYC Refresh] Verified outputs:', JSON.stringify(verifiedOutputs, null, 2));
        
        // Extract verified data from Stripe Identity
        const updateData: any = { 
          kycStatus: 'verified',
          kycVerifiedAt: new Date(),
          stripeIdentityVerificationId: userSession.id,
        };
        
        // Capture legal name if available
        if (verifiedOutputs?.first_name || verifiedOutputs?.last_name) {
          updateData.verifiedLegalName = `${verifiedOutputs.first_name || ''} ${verifiedOutputs.last_name || ''}`.trim();
        }
        
        // Capture address if available
        if (verifiedOutputs?.address) {
          const addr = verifiedOutputs.address;
          updateData.verifiedAddress = addr.line1 || '';
          updateData.verifiedCity = addr.city || '';
          updateData.verifiedState = addr.state || '';
          updateData.verifiedPostalCode = addr.postal_code || '';
          updateData.verifiedCountry = addr.country || '';
          console.log('[KYC Refresh] Captured address:', addr);
        }
        
        // Capture DOB if available
        if (verifiedOutputs?.dob) {
          const dob = verifiedOutputs.dob;
          updateData.verifiedDob = `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`;
        }
        
        await storage.updateUser(userId, updateData);
        
        // Send notification
        sendKycStatusNotification(
          user.email,
          user.phone,
          user.firstName,
          'verified',
          user.notifyEmail && user.emailKycUpdates,
          user.notifySMS && user.smsKycUpdates
        ).catch(console.error);
        
        return res.json({ status: 'verified', message: "Verification complete!" });
      } else if (userSession.status === 'requires_input') {
        await storage.updateUser(userId, { kycStatus: 'failed' });
        return res.json({ status: 'failed', message: "Verification requires additional input" });
      } else {
        return res.json({ status: userSession.status, message: `Verification status: ${userSession.status}` });
      }
    } catch (error) {
      next(error);
    }
  });

  // Restart KYC verification (user self-service)
  app.post("/api/security/kyc/restart", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.kycStatus === 'verified') return res.status(400).json({ error: "Already verified" });
      if (user.kycStatus !== 'pending' && user.kycStatus !== 'failed') {
        return res.status(400).json({ error: "Can only restart pending or failed verification" });
      }

      await storage.updateUser(userId, { kycStatus: 'not_started' });
      res.json({ message: "KYC status reset. You can now start verification again." });
    } catch (error) {
      next(error);
    }
  });

  // Get security status
  app.get("/api/security/status", requireAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        hasTransactionPin: !!user.transactionPin,
        twoFactorEnabled: user.twoFactorEnabled,
        kycStatus: user.kycStatus,
        kycVerified: user.kycStatus === 'verified',
      });
    } catch (error) {
      next(error);
    }
  });

  // ========== TRANSACTION HISTORY ROUTES ==========

  // Get user transaction history
  app.get("/api/user/transactions", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const transactions = await storage.getUserTransactionHistory(userId);
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  // ========== ACTIVITY FEED ROUTES ==========

  app.get("/api/user/activity", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const userContributions = await db.select({
        id: contributions.id,
        amount: contributions.amount,
        createdAt: contributions.createdAt,
        poolId: contributions.poolId,
      })
      .from(contributions)
      .where(eq(contributions.userId, userId))
      .orderBy(desc(contributions.createdAt))
      .limit(50);
      
      const deposits = await db.select()
        .from(walletDeposits)
        .where(eq(walletDeposits.userId, userId))
        .orderBy(desc(walletDeposits.createdAt))
        .limit(20);
      
      const withdrawals = await db.select()
        .from(walletWithdrawals)
        .where(eq(walletWithdrawals.userId, userId))
        .orderBy(desc(walletWithdrawals.createdAt))
        .limit(20);
      
      const userPools = await storage.getPoolsByCreator(userId);
      const poolIds = userPools.map(p => p.id);
      let spendActivities: any[] = [];
      let poolWithdrawalActivities: any[] = [];
      let poolTransferActivities: any[] = [];
      if (poolIds.length > 0) {
        spendActivities = await db.select()
          .from(poolActivities)
          .where(and(
            inArray(poolActivities.poolId, poolIds),
            eq(poolActivities.type, 'spend')
          ))
          .orderBy(desc(poolActivities.createdAt))
          .limit(20);
        poolWithdrawalActivities = await db.select()
          .from(poolActivities)
          .where(and(
            inArray(poolActivities.poolId, poolIds),
            eq(poolActivities.type, 'withdrawal')
          ))
          .orderBy(desc(poolActivities.createdAt))
          .limit(20);
        poolTransferActivities = await db.select()
          .from(poolActivities)
          .where(and(
            inArray(poolActivities.poolId, poolIds),
            eq(poolActivities.type, 'transfer')
          ))
          .orderBy(desc(poolActivities.createdAt))
          .limit(20);
      }
      
      const activities: any[] = [];
      
      for (const c of userContributions) {
        const pool = await storage.getPool(c.poolId);
        activities.push({
          id: `contrib-${c.id}`,
          type: 'contribution',
          amount: c.amount,
          description: `Contributed to "${pool?.title || 'pool'}"`,
          poolId: c.poolId,
          poolTitle: pool?.title || 'Unknown Pool',
          createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'out',
        });
      }
      
      for (const d of deposits) {
        activities.push({
          id: `deposit-${d.id}`,
          type: 'deposit',
          amount: d.amount,
          description: 'Added funds to wallet',
          createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'in',
        });
      }
      
      for (const w of withdrawals) {
        activities.push({
          id: `withdraw-${w.id}`,
          type: 'withdrawal',
          amount: w.amount,
          description: `Withdrawal ${w.status === 'completed' ? 'completed' : w.status === 'pending_review' ? 'pending review' : w.status}`,
          status: w.status,
          createdAt: w.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'out',
        });
      }
      
      for (const s of spendActivities) {
        const pool = await storage.getPool(s.poolId);
        activities.push({
          id: `spend-${s.id}`,
          type: 'spend',
          amount: s.amount,
          description: s.description || `Spent at ${s.merchant || 'merchant'}`,
          merchant: s.merchant,
          poolId: s.poolId,
          poolTitle: pool?.title || 'Unknown Pool',
          createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'out',
        });
      }
      
      for (const pw of poolWithdrawalActivities) {
        const pool = await storage.getPool(pw.poolId);
        activities.push({
          id: `pool-withdrawal-${pw.id}`,
          type: 'pool_withdrawal',
          amount: pw.amount,
          description: pw.description || `Withdrew from pool`,
          poolId: pw.poolId,
          poolTitle: pool?.title || 'Unknown Pool',
          createdAt: pw.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'out',
        });
      }
      
      for (const pt of poolTransferActivities) {
        const pool = await storage.getPool(pt.poolId);
        activities.push({
          id: `pool-transfer-${pt.id}`,
          type: 'transfer',
          amount: pt.amount,
          description: pt.description || `Transferred from pool`,
          poolId: pt.poolId,
          poolTitle: pool?.title || 'Unknown Pool',
          createdAt: pt.createdAt?.toISOString() || new Date().toISOString(),
          direction: 'out',
        });
      }
      
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({ activities: activities.slice(0, 50) });
    } catch (error) {
      next(error);
    }
  });

  // Get activity feed for followed users
  app.get("/api/activity-feed", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      
      // Get users this user is following
      const followingList = await db.select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));
      
      const followingIds = followingList.map(f => f.followingId);
      
      if (followingIds.length === 0) {
        return res.json({ activities: [] });
      }

      // Get recent contributions from followed users
      const recentContributions = await db.select({
        id: contributions.id,
        amount: contributions.amount,
        createdAt: contributions.createdAt,
        userId: contributions.userId,
        poolId: contributions.poolId,
      })
      .from(contributions)
      .where(inArray(contributions.userId, followingIds))
      .orderBy(desc(contributions.createdAt))
      .limit(50);

      // Get pool info for contributions
      const activities = await Promise.all(
        recentContributions.map(async (c) => {
          const pool = await storage.getPool(c.poolId);
          const user = c.userId ? await storage.getUser(c.userId) : null;
          return {
            id: `contrib-${c.id}`,
            type: 'contribution' as const,
            userId: c.userId || '',
            userName: user ? `${user.firstName} ${user.lastName}` : 'Anonymous',
            userAvatar: user?.avatar || undefined,
            poolId: c.poolId,
            poolTitle: pool?.title || 'Unknown Pool',
            amount: c.amount,
            createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
          };
        })
      );

      res.json({ activities });
    } catch (error) {
      next(error);
    }
  });

  // ========== NOTIFICATION PREFERENCES ROUTES ==========

  // Get notification preferences
  app.get("/api/user/notification-preferences", requireAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        preferences: {
          emailContributions: user.notifyEmail,
          emailPoolUpdates: user.notifyEmail,
          emailPoolComplete: user.notifyEmail,
          emailInvites: user.notifyEmail,
          emailSecurityAlerts: user.emailSecurityAlerts,
          emailKycUpdates: user.emailKycUpdates,
          emailCardActivity: user.emailCardActivity,
          emailWalletActivity: user.emailWalletActivity,
          emailAccountChanges: user.emailAccountChanges,
          smsContributions: user.notifySMS,
          smsPoolComplete: user.notifySMS,
          smsInvites: user.notifySMS,
          smsSecurityAlerts: user.smsSecurityAlerts,
          smsKycUpdates: user.smsKycUpdates,
          smsCardActivity: user.smsCardActivity,
          smsWalletActivity: user.smsWalletActivity,
          smsAccountChanges: user.smsAccountChanges,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Update notification preferences
  app.put("/api/user/notification-preferences", requireAuth, async (req, res, next) => {
    try {
      const prefsSchema = z.object({
        emailContributions: z.boolean().optional(),
        emailPoolUpdates: z.boolean().optional(),
        emailPoolComplete: z.boolean().optional(),
        emailInvites: z.boolean().optional(),
        emailSecurityAlerts: z.boolean().optional(),
        emailKycUpdates: z.boolean().optional(),
        emailCardActivity: z.boolean().optional(),
        emailWalletActivity: z.boolean().optional(),
        emailAccountChanges: z.boolean().optional(),
        smsContributions: z.boolean().optional(),
        smsPoolComplete: z.boolean().optional(),
        smsInvites: z.boolean().optional(),
        smsSecurityAlerts: z.boolean().optional(),
        smsKycUpdates: z.boolean().optional(),
        smsCardActivity: z.boolean().optional(),
        smsWalletActivity: z.boolean().optional(),
        smsAccountChanges: z.boolean().optional(),
      });

      const prefs = prefsSchema.parse(req.body);
      const userId = req.session.userId!;

      const updateData: Record<string, boolean> = {};

      // Pool activity preferences (legacy notifyEmail/notifySMS)
      const hasEmailPoolPrefs = prefs.emailContributions !== undefined || prefs.emailPoolUpdates !== undefined || 
                                prefs.emailPoolComplete !== undefined || prefs.emailInvites !== undefined;
      const hasSmsPoolPrefs = prefs.smsContributions !== undefined || prefs.smsPoolComplete !== undefined || 
                              prefs.smsInvites !== undefined;

      if (hasEmailPoolPrefs) {
        updateData.notifyEmail = Boolean(prefs.emailContributions || prefs.emailPoolUpdates || 
                                         prefs.emailPoolComplete || prefs.emailInvites);
      }
      if (hasSmsPoolPrefs) {
        updateData.notifySMS = Boolean(prefs.smsContributions || prefs.smsPoolComplete || prefs.smsInvites);
      }

      // Per-channel per-category preferences
      if (prefs.emailSecurityAlerts !== undefined) updateData.emailSecurityAlerts = prefs.emailSecurityAlerts;
      if (prefs.emailKycUpdates !== undefined) updateData.emailKycUpdates = prefs.emailKycUpdates;
      if (prefs.emailCardActivity !== undefined) updateData.emailCardActivity = prefs.emailCardActivity;
      if (prefs.emailWalletActivity !== undefined) updateData.emailWalletActivity = prefs.emailWalletActivity;
      if (prefs.emailAccountChanges !== undefined) updateData.emailAccountChanges = prefs.emailAccountChanges;
      if (prefs.smsSecurityAlerts !== undefined) updateData.smsSecurityAlerts = prefs.smsSecurityAlerts;
      if (prefs.smsKycUpdates !== undefined) updateData.smsKycUpdates = prefs.smsKycUpdates;
      if (prefs.smsCardActivity !== undefined) updateData.smsCardActivity = prefs.smsCardActivity;
      if (prefs.smsWalletActivity !== undefined) updateData.smsWalletActivity = prefs.smsWalletActivity;
      if (prefs.smsAccountChanges !== undefined) updateData.smsAccountChanges = prefs.smsAccountChanges;

      if (Object.keys(updateData).length > 0) {
        await db.update(users)
          .set(updateData)
          .where(eq(users.id, userId));
      }

      res.json({ message: "Preferences updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========== DEVELOPER API ROUTES ==========

  // Request developer API access
  app.post("/api/developer/request-access", requireAuth, async (req, res, next) => {
    try {
      const requestSchema = z.object({
        companyName: z.string().min(1, "Company name is required"),
        website: z.string().url("Please enter a valid website URL"),
        useCase: z.string().min(5, "Please describe your use case (at least 5 characters)"),
        monthlyVolume: z.string().min(1, "Please select expected transaction volume"),
        email: z.string().email().optional(),
        name: z.string().optional(),
      });

      const data = requestSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check for duplicate request from same user for same website
      const existingRequests = await db.select()
        .from(apiAccessRequests)
        .where(
          and(
            eq(apiAccessRequests.userId, user.id),
            eq(apiAccessRequests.website, data.website)
          )
        );
      
      if (existingRequests.length > 0) {
        const existing = existingRequests[0];
        return res.status(409).json({ 
          error: `You already have a ${existing.status} API access request for this website.`,
          existingRequest: {
            id: existing.id,
            status: existing.status,
            createdAt: existing.createdAt,
          }
        });
      }

      // Store API access request
      await storage.createApiAccessRequest({
        userId: user.id,
        companyName: data.companyName,
        website: data.website,
        useCase: data.useCase,
        monthlyVolume: data.monthlyVolume,
      });

      // Send confirmation email to user
      const { sendEmail } = await import('./notificationService');
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
            <h1 style="color: #d4ff00; margin: 0 0 16px;">API Access Request Received 📝</h1>
            <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
              Hey ${user.firstName},<br><br>
              We've received your ChipInPay API access request for <strong>${data.companyName}</strong>.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #94a3b8; margin: 0;">
                <strong>Company:</strong> ${data.companyName}<br>
                <strong>Website:</strong> ${data.website}<br>
                <strong>Expected Volume:</strong> ${data.monthlyVolume}
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0;">
              Our team will review your application and get back to you within 2-3 business days.
            </p>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
            ChipIn - Pool funds together. Pay smarter.
          </p>
        </div>
      `;
      
      sendEmail(user.email, '📝 API Access Request Received - ChipIn', confirmationHtml)
        .catch(err => console.error('[Email] Failed to send API request confirmation:', err));

      // Send admin notification email
      const adminApiRequestHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
            <h1 style="color: #d4ff00; margin: 0 0 16px;">🔑 New API Access Request</h1>
            <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
              A new developer has requested API access.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #94a3b8; margin: 0;">
                <strong>Requester:</strong> ${user.firstName} ${user.lastName}<br>
                <strong>Email:</strong> ${user.email}<br>
                <strong>Company:</strong> ${data.companyName}<br>
                <strong>Website:</strong> ${data.website}<br>
                <strong>Use Case:</strong> ${data.useCase}<br>
                <strong>Expected Volume:</strong> ${data.monthlyVolume}
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0;">
              Please review this request in the admin portal at /admin/api-requests.
            </p>
          </div>
        </div>
      `;
      
      sendEmail('mail@chipinpool.com', '🔑 New API Access Request - Action Required', adminApiRequestHtml)
        .catch(err => console.error('[Email] Failed to send admin API request notification:', err));

      console.log(`[Developer API] New access request from ${user.email}:`, {
        companyName: data.companyName,
        website: data.website,
        useCase: data.useCase,
        monthlyVolume: data.monthlyVolume,
      });

      res.json({ 
        message: "API access request submitted successfully",
        email: user.email,
      });
    } catch (error) {
      next(error);
    }
  });

  // ========== CHIPINPAY MERCHANT API ==========

  // Merchant registration
  app.post("/api/merchant/register", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        companyName: z.string().min(1),
        website: z.string().url(),
        businessType: z.string().min(1),
        description: z.string().optional().transform(v => v === '' ? undefined : v),
        contactEmail: z.string().email(),
        contactPhone: z.string().optional().transform(v => v === '' ? undefined : v),
        webhookUrl: z.string().url().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
      });

      const data = schema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if user already has a merchant account
      const existingMerchant = await storage.getMerchantByUserId(user.id);
      if (existingMerchant) {
        return res.status(400).json({ error: "You already have a merchant account" });
      }

      // Create merchant
      const merchant = await storage.createMerchant({
        userId: user.id,
        companyName: data.companyName,
        website: data.website,
        businessType: data.businessType,
        description: data.description ?? null,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone ?? null,
        webhookUrl: data.webhookUrl ?? null,
      });

      // Generate and set webhook secret
      const crypto = await import('crypto');
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
      await storage.updateMerchant(merchant.id, { webhookSecret });

      res.json({ 
        merchant: {
          id: merchant.id,
          companyName: merchant.companyName,
          status: merchant.status,
          feePercent: merchant.feePercent,
        },
        message: "Merchant account created. Pending approval.",
      });
    } catch (error: any) {
      console.error('Merchant registration error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      next(error);
    }
  });

  // Get merchant account
  app.get("/api/merchant/account", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      res.json({
        id: merchant.id,
        companyName: merchant.companyName,
        website: merchant.website,
        businessType: merchant.businessType,
        status: merchant.status,
        feePercent: merchant.feePercent,
        totalVolume: merchant.totalVolume,
        totalFees: merchant.totalFees,
        pendingBalance: merchant.pendingBalance,
        webhookUrl: merchant.webhookUrl,
        createdAt: merchant.createdAt,
      });
    } catch (error) {
      next(error);
    }
  });

  // Update merchant webhook URL
  app.put("/api/merchant/webhook", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        webhookUrl: z.string().url(),
      });

      const data = schema.parse(req.body);
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      await storage.updateMerchant(merchant.id, { webhookUrl: data.webhookUrl });

      res.json({ 
        message: "Webhook URL updated",
        webhookUrl: data.webhookUrl,
        webhookSecret: merchant.webhookSecret,
      });
    } catch (error) {
      next(error);
    }
  });

  // Create API key
  app.post("/api/merchant/api-keys", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
      });

      const data = schema.parse(req.body);
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      if (merchant.status !== 'approved') {
        return res.status(403).json({ error: "Merchant account must be approved to create API keys" });
      }

      const crypto = await import('crypto');
      const keyPrefix = `cpay_${crypto.randomBytes(4).toString('hex')}`;
      const keySecret = crypto.randomBytes(24).toString('hex');
      const fullKey = `${keyPrefix}_${keySecret}`;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      await storage.createMerchantApiKey({
        merchantId: merchant.id,
        name: data.name,
        keyPrefix,
        keyHash,
      });

      res.json({
        name: data.name,
        key: fullKey,
        prefix: keyPrefix,
        message: "Store this key securely. You won't be able to see it again.",
      });
    } catch (error) {
      next(error);
    }
  });

  // List API keys
  app.get("/api/merchant/api-keys", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      const keys = await storage.getMerchantApiKeys(merchant.id);
      res.json(keys.map(k => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      })));
    } catch (error) {
      next(error);
    }
  });

  // Revoke API key
  app.delete("/api/merchant/api-keys/:id", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      await storage.deactivateApiKey(req.params.id);
      res.json({ message: "API key revoked" });
    } catch (error) {
      next(error);
    }
  });

  // Get merchant transactions/sessions
  app.get("/api/merchant/sessions", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      const sessions = await storage.getMerchantCheckoutSessions(merchant.id);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  // Get merchant payouts
  app.get("/api/merchant/payouts", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      const payouts = await storage.getMerchantPayouts(merchant.id);
      res.json(payouts);
    } catch (error) {
      next(error);
    }
  });

  // Request merchant payout
  app.post("/api/merchant/payouts/request", requireAuth, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchantByUserId(req.session.userId!);
      if (!merchant) {
        return res.status(404).json({ error: "No merchant account found" });
      }

      if (merchant.status !== 'approved') {
        return res.status(403).json({ error: "Merchant account must be approved to request payouts" });
      }

      const pendingBalance = parseFloat(merchant.pendingBalance);
      if (pendingBalance < 10) {
        return res.status(400).json({ error: "Minimum payout is $10. Your current balance is $" + pendingBalance.toFixed(2) });
      }

      // Check for existing pending payout
      const existingPayouts = await storage.getMerchantPayouts(merchant.id);
      const pendingPayout = existingPayouts.find(p => p.status === 'pending' || p.status === 'processing');
      if (pendingPayout) {
        return res.status(400).json({ error: "You already have a pending payout request" });
      }

      // If merchant has Stripe Connect, process immediately with transactional safety
      if (merchant.stripeConnectId) {
        // Create payout in processing state
        const [payout] = await db.insert(merchantPayouts).values({
          merchantId: merchant.id,
          amount: pendingBalance.toFixed(2),
          status: 'processing',
        }).returning();

        // Immediately reserve the balance to prevent race conditions
        const [updatedMerchant] = await db.update(merchants).set({
          pendingBalance: '0.00',
        }).where(eq(merchants.id, merchant.id)).returning();

        try {
          const stripe = await getUncachableStripeClient();
          const transfer = await stripe.transfers.create({
            amount: Math.round(pendingBalance * 100),
            currency: 'usd',
            destination: merchant.stripeConnectId,
            description: `ChipInPay payout for ${merchant.companyName}`,
            metadata: { payoutId: payout.id, merchantId: merchant.id },
          });

          // Update payout with Stripe transfer ID and mark as completed
          await db.update(merchantPayouts).set({
            stripeTransferId: transfer.id,
            status: 'completed',
          }).where(eq(merchantPayouts.id, payout.id));

          // Update total payouts
          await db.update(merchants).set({
            totalPayouts: sql`${merchants.totalPayouts}::decimal + ${pendingBalance}::decimal`,
          }).where(eq(merchants.id, merchant.id));

          console.log(`[ChipInPay] Processed payout ${payout.id} for merchant ${merchant.id}: $${pendingBalance.toFixed(2)} via Stripe Transfer ${transfer.id}`);

          res.json({
            payout: { ...payout, status: 'completed', stripeTransferId: transfer.id },
            message: "Payout processed successfully! Funds will arrive in your connected account within 2 business days.",
          });
        } catch (stripeError: any) {
          console.error('[ChipInPay] Stripe transfer failed:', stripeError);
          
          // Rollback: restore the balance and mark payout as failed
          await db.update(merchants).set({
            pendingBalance: pendingBalance.toFixed(2),
          }).where(eq(merchants.id, merchant.id));
          
          await db.update(merchantPayouts).set({ status: 'failed' }).where(eq(merchantPayouts.id, payout.id));
          
          return res.status(500).json({ error: "Payment processing failed. Please try again or contact support." });
        }
      } else {
        // No Stripe Connect - queue for manual processing
        const payout = await storage.createMerchantPayout({
          merchantId: merchant.id,
          amount: pendingBalance.toFixed(2),
        });
        
        console.log(`[ChipInPay] Merchant ${merchant.id} requested payout but has no Stripe Connect. Queued for manual review.`);
        res.json({
          payout,
          message: "Payout request submitted. Please connect your Stripe account to receive automatic payouts, or wait for manual processing (3-5 business days).",
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // ========== CHIPINPAY PUBLIC API (for merchants) ==========

  // Middleware to authenticate merchant API requests
  const authenticateMerchantApi = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }

    const apiKey = authHeader.substring(7);
    const [prefix] = apiKey.split('_').slice(0, 2).join('_').split('_');
    const fullPrefix = apiKey.split('_').slice(0, 2).join('_');
    
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await storage.getMerchantApiKeyByPrefix(fullPrefix);
    if (!keyRecord || keyRecord.keyHash !== keyHash) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const merchant = await storage.getMerchant(keyRecord.merchantId);
    if (!merchant || merchant.status !== 'approved') {
      return res.status(403).json({ error: "Merchant account not active" });
    }

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(keyRecord.id);

    req.merchant = merchant;
    next();
  };

  // Create a ChipInPay checkout session (merchant API)
  app.post("/api/v1/merchant/checkout", authenticateMerchantApi, async (req: any, res, next) => {
    try {
      const schema = z.object({
        orderId: z.string().min(1),
        amount: z.number().positive().max(50000),
        productTitle: z.string().min(1),
        productDescription: z.string().optional(),
        productImage: z.string().url().optional(),
        collectionDeadlineHours: z.number().min(1).max(720).default(72),
        customerEmail: z.string().email().optional(),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
        metadata: z.record(z.string()).optional(),
      });

      const data = schema.parse(req.body);
      const merchant = req.merchant;

      // Check for existing session with same order ID
      const existingSession = await storage.getMerchantCheckoutSessionByOrderId(merchant.id, data.orderId);
      if (existingSession && existingSession.status !== 'cancelled' && existingSession.status !== 'expired') {
        return res.status(400).json({ error: "Order already has an active checkout session" });
      }

      // Calculate fees (5%)
      const feePercent = parseFloat(merchant.feePercent);
      const feeAmount = (data.amount * feePercent / 100).toFixed(2);
      const netAmount = (data.amount - parseFloat(feeAmount)).toFixed(2);

      // Calculate deadline
      const collectionDeadline = new Date(Date.now() + data.collectionDeadlineHours * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes to start the session

      const session = await storage.createMerchantCheckoutSession({
        merchantId: merchant.id,
        externalOrderId: data.orderId,
        amount: data.amount.toFixed(2),
        feeAmount,
        netAmount,
        productTitle: data.productTitle,
        productDescription: data.productDescription || null,
        productImage: data.productImage || null,
        collectionDeadline,
        successUrl: data.successUrl || null,
        cancelUrl: data.cancelUrl || null,
        customerEmail: data.customerEmail || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        expiresAt,
      });

      // Support both Replit and Azure production environments
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (process.env.WEBSITE_HOSTNAME) {
        baseUrl = `https://${process.env.WEBSITE_HOSTNAME}`;
      } else if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      }

      res.json({
        sessionId: session.id,
        checkoutUrl: `${baseUrl}/chipinpay/checkout/${session.id}`,
        amount: data.amount,
        feeAmount: parseFloat(feeAmount),
        netAmount: parseFloat(netAmount),
        collectionDeadline: collectionDeadline.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'pending',
      });
    } catch (error) {
      next(error);
    }
  });

  // Get checkout session status (merchant API)
  app.get("/api/v1/merchant/checkout/:sessionId", authenticateMerchantApi, async (req: any, res, next) => {
    try {
      const session = await storage.getMerchantCheckoutSession(req.params.sessionId);
      if (!session || session.merchantId !== req.merchant.id) {
        return res.status(404).json({ error: "Session not found" });
      }

      let pool = null;
      if (session.poolId) {
        pool = await storage.getPool(session.poolId);
      }

      res.json({
        sessionId: session.id,
        orderId: session.externalOrderId,
        status: session.status,
        amount: session.amount,
        collectedAmount: session.collectedAmount,
        percentComplete: pool ? Math.min(100, Math.round((parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100)) : 0,
        feeAmount: session.feeAmount,
        netAmount: session.netAmount,
        collectionDeadline: session.collectionDeadline,
        completedAt: session.completedAt,
        poolId: session.poolId,
      });
    } catch (error) {
      next(error);
    }
  });

  // Cancel checkout session (merchant API)
  app.post("/api/v1/merchant/checkout/:sessionId/cancel", authenticateMerchantApi, async (req: any, res, next) => {
    try {
      const session = await storage.getMerchantCheckoutSession(req.params.sessionId);
      if (!session || session.merchantId !== req.merchant.id) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ error: "Cannot cancel completed session" });
      }

      await storage.updateCheckoutSessionStatus(session.id, 'cancelled');

      // TODO: Refund any collected contributions

      res.json({ message: "Session cancelled", status: 'cancelled' });
    } catch (error) {
      next(error);
    }
  });

  // ========== CHIPINPAY CUSTOMER CHECKOUT FLOW ==========

  // Get checkout session details (public, for customer view)
  app.get("/api/chipinpay/checkout/:sessionId", async (req, res, next) => {
    try {
      const session = await storage.getMerchantCheckoutSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Checkout session not found" });
      }

      if (session.status === 'expired' || new Date() > session.expiresAt) {
        if (session.status !== 'expired') {
          await storage.updateCheckoutSessionStatus(session.id, 'expired');
        }
        return res.status(410).json({ error: "Checkout session has expired" });
      }

      const merchant = await storage.getMerchant(session.merchantId);
      let pool = null;
      let contributions: any[] = [];

      if (session.poolId) {
        pool = await storage.getPool(session.poolId);
        contributions = await storage.getContributionsByPool(session.poolId);
      }

      res.json({
        sessionId: session.id,
        status: session.status,
        merchant: {
          name: merchant?.companyName,
          logo: merchant?.logo,
        },
        product: {
          title: session.productTitle,
          description: session.productDescription,
          image: session.productImage,
        },
        amount: session.amount,
        collectedAmount: session.collectedAmount,
        percentComplete: pool ? Math.min(100, Math.round((parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100)) : 0,
        collectionDeadline: session.collectionDeadline,
        poolId: session.poolId,
        contributorCount: contributions.length,
      });
    } catch (error) {
      next(error);
    }
  });

  // Start ChipInPay checkout - create pool for the session
  app.post("/api/chipinpay/checkout/:sessionId/start", requireAuth, async (req, res, next) => {
    try {
      const session = await storage.getMerchantCheckoutSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Checkout session not found" });
      }

      if (session.status !== 'pending') {
        return res.status(400).json({ error: "Session already started or completed" });
      }

      if (new Date() > session.expiresAt) {
        await storage.updateCheckoutSessionStatus(session.id, 'expired');
        return res.status(410).json({ error: "Checkout session has expired" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Create a pool for this checkout
      const pool = await storage.createPool({
        title: session.productTitle,
        description: session.productDescription || `ChipInPay checkout for ${session.productTitle}`,
        targetAmount: session.amount,
        category: 'Purchase',
        creatorId: user.id,
        deadline: session.collectionDeadline,
        image: session.productImage || null,
      });

      // Update session with pool ID and set to collecting
      await storage.updateCheckoutSessionPool(session.id, pool.id);
      await storage.updateCheckoutSessionStatus(session.id, 'collecting');

      // Send webhook to merchant
      const merchant = await storage.getMerchant(session.merchantId);
      if (merchant?.webhookUrl) {
        sendMerchantWebhook(merchant, session.id, 'session.collecting', {
          sessionId: session.id,
          orderId: session.externalOrderId,
          status: 'collecting',
          poolId: pool.id,
          customerId: user.id,
          customerEmail: user.email,
        });
      }

      res.json({
        poolId: pool.id,
        status: 'collecting',
        message: "Pool created. Invite friends to contribute!",
      });
    } catch (error) {
      next(error);
    }
  });

  // Helper function to send webhooks to merchants
  async function sendMerchantWebhook(merchant: any, sessionId: string, event: string, payload: any) {
    if (!merchant.webhookUrl) return;

    try {
      const crypto = await import('crypto');
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', merchant.webhookSecret || '')
        .update(`${timestamp}.${payloadStr}`)
        .digest('hex');

      const delivery = await storage.createWebhookDelivery({
        merchantId: merchant.id,
        sessionId,
        event: event as any,
        payload: payloadStr,
      });

      const response = await fetch(merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChipInPay-Signature': `t=${timestamp},v1=${signature}`,
          'X-ChipInPay-Event': event,
        },
        body: payloadStr,
      });

      await storage.updateWebhookDelivery(
        delivery.id,
        response.status,
        await response.text().catch(() => ''),
        response.ok
      );
    } catch (error) {
      console.error('[ChipInPay Webhook] Failed to deliver:', error);
    }
  }

  // ========== ADMIN ROUTES ==========

  // Log admin action helper
  const logAdminAction = async (adminId: string, action: string, targetType: string, targetId?: string, details?: string, ipAddress?: string) => {
    await db.insert(adminAuditLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress,
    });
  };

  // Admin dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res, next) => {
    try {
      const [
        totalUsersResult,
        activePoolsResult,
        completedPoolsResult,
        totalContributionsResult,
        pendingKycResult,
        suspendedUsersResult,
      ] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(users),
        db.select({ count: sql`count(*)` }).from(pools).where(eq(pools.status, 'active')),
        db.select({ count: sql`count(*)` }).from(pools).where(eq(pools.status, 'completed')),
        db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(contributions),
        db.select({ count: sql`count(*)` }).from(users).where(eq(users.kycStatus, 'pending')),
        db.select({ count: sql`count(*)` }).from(users).where(eq(users.suspended, true)),
      ]);

      // Recent signups (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSignupsResult = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);

      res.json({
        totalUsers: Number(totalUsersResult[0]?.count || 0),
        activePools: Number(activePoolsResult[0]?.count || 0),
        completedPools: Number(completedPoolsResult[0]?.count || 0),
        totalContributions: Number(totalContributionsResult[0]?.total || 0),
        pendingKyc: Number(pendingKycResult[0]?.count || 0),
        suspendedUsers: Number(suspendedUsersResult[0]?.count || 0),
        recentSignups: Number(recentSignupsResult[0]?.count || 0),
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin list users
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || '';
      const kycStatus = req.query.kycStatus as string || '';
      const offset = (page - 1) * limit;

      let query = db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        phone: users.phone,
        kycStatus: users.kycStatus,
        role: users.role,
        suspended: users.suspended,
        poolsCreated: users.poolsCreated,
        totalContributed: users.totalContributed,
        createdAt: users.createdAt,
      }).from(users);

      if (search) {
        query = query.where(
          sql`${users.email} ILIKE ${'%' + search + '%'} OR ${users.firstName} ILIKE ${'%' + search + '%'} OR ${users.lastName} ILIKE ${'%' + search + '%'} OR ${users.username} ILIKE ${'%' + search + '%'}`
        ) as any;
      }

      if (kycStatus && ['not_started', 'pending', 'verified', 'failed'].includes(kycStatus)) {
        query = query.where(eq(users.kycStatus, kycStatus as any)) as any;
      }

      const userList = await query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

      const totalResult = await db.select({ count: sql`count(*)` }).from(users);
      const total = Number(totalResult[0]?.count || 0);

      res.json({
        users: userList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin get user details
  app.get("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userPools = await storage.getPoolsByCreator(user.id);
      const userContributions = await db.select().from(contributions).where(eq(contributions.userId, user.id));

      const { password, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        pools: userPools,
        contributions: userContributions,
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin suspend user
  app.post("/api/admin/users/:id/suspend", requireAdmin, async (req: any, res, next) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Admin not authenticated" });
      }

      const { reason } = req.body || {};
      const userId = req.params.id;
      const sanitizedReason = typeof reason === 'string' ? reason.slice(0, 500) : 'Suspended by admin';

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === 'admin') {
        return res.status(403).json({ message: "Cannot suspend admin users" });
      }

      await db.update(users).set({
        suspended: true,
        suspendedAt: new Date(),
        suspendedReason: sanitizedReason,
      }).where(eq(users.id, userId));

      await logAdminAction(adminId, 'suspend_user', 'user', userId, sanitizedReason);

      res.json({ message: "User suspended successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Admin reset user KYC status
  app.post("/api/admin/users/:id/reset-kyc", requireAdmin, async (req: any, res, next) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Admin not authenticated" });
      }

      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.kycStatus === 'verified') {
        return res.status(400).json({ message: "Cannot reset verified KYC status" });
      }

      await storage.updateUser(userId, { kycStatus: 'not_started' });
      await logAdminAction(adminId, 'reset_kyc', 'user', userId, `Reset KYC status from ${user.kycStatus} to not_started`);

      res.json({ message: "KYC status reset successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Admin unsuspend user
  app.post("/api/admin/users/:id/unsuspend", requireAdmin, async (req: any, res, next) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Admin not authenticated" });
      }

      const userId = req.params.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await db.update(users).set({
        suspended: false,
        suspendedAt: null,
        suspendedReason: null,
      }).where(eq(users.id, userId));

      await logAdminAction(adminId, 'unsuspend_user', 'user', userId);

      res.json({ message: "User unsuspended successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Admin list all pools
  app.get("/api/admin/pools", requireAdmin, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string || '';
      const offset = (page - 1) * limit;

      let query = db.select().from(pools);

      if (status && ['active', 'completed', 'expired'].includes(status)) {
        query = query.where(eq(pools.status, status as any)) as any;
      }

      const poolList = await query.orderBy(desc(pools.createdAt)).limit(limit).offset(offset);

      const totalResult = await db.select({ count: sql`count(*)` }).from(pools);
      const total = Number(totalResult[0]?.count || 0);

      res.json({
        pools: poolList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin list all transactions
  app.get("/api/admin/transactions", requireAdmin, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const transactionList = await db.select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db.select({ count: sql`count(*)` }).from(transactions);
      const total = Number(totalResult[0]?.count || 0);

      res.json({
        transactions: transactionList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin audit logs
  app.get("/api/admin/audit-logs", requireAdmin, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const logs = await db.select()
        .from(adminAuditLogs)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({ logs });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get API access requests
  app.get("/api/admin/api-requests", requireAdmin, async (req, res, next) => {
    try {
      const status = req.query.status as string || 'all';
      
      let query = db.select({
        id: apiAccessRequests.id,
        userId: apiAccessRequests.userId,
        companyName: apiAccessRequests.companyName,
        website: apiAccessRequests.website,
        useCase: apiAccessRequests.useCase,
        monthlyVolume: apiAccessRequests.monthlyVolume,
        status: apiAccessRequests.status,
        createdAt: apiAccessRequests.createdAt,
        user: {
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
        .from(apiAccessRequests)
        .leftJoin(users, eq(apiAccessRequests.userId, users.id))
        .orderBy(desc(apiAccessRequests.createdAt));
      
      if (status !== 'all') {
        query = query.where(eq(apiAccessRequests.status, status)) as any;
      }
      
      const requests = await query;
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Approve/reject API access request
  app.post("/api/admin/api-requests/:id/update", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }
      
      await db.update(apiAccessRequests)
        .set({ status })
        .where(eq(apiAccessRequests.id, id));
      
      // Log admin action
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: `${status}_api_request`,
        targetType: 'api_access_request',
        targetId: id,
        details: JSON.stringify({ status }),
      });
      
      res.json({ success: true, message: `API access request ${status}` });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get real-time Stripe data (no sync, direct API queries)
  app.get("/api/admin/stripe/payments", requireAdmin, async (req: any, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const days = parseInt(req.query.days as string) || 7;
      
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: {
          gte: Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60),
        },
        expand: ['data.payment_intent'],
      });

      const payments = sessions.data
        .filter(s => s.payment_status === 'paid')
        .map(session => ({
          id: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          status: session.payment_status,
          type: session.metadata?.type || 'pool_contribution',
          userId: session.metadata?.userId || null,
          poolId: session.metadata?.poolId || null,
          customerEmail: session.customer_email,
          created: new Date(session.created * 1000).toISOString(),
        }));

      res.json({ payments, count: payments.length });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get real-time identity verification sessions from Stripe
  app.get("/api/admin/stripe/identity", requireAdmin, async (req: any, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const days = parseInt(req.query.days as string) || 7;
      
      const verificationSessions = await stripe.identity.verificationSessions.list({
        limit: 100,
        created: {
          gte: Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60),
        },
      });

      const sessions = verificationSessions.data.map(vs => ({
        id: vs.id,
        status: vs.status,
        userId: vs.metadata?.userId || null,
        type: vs.type,
        created: new Date(vs.created * 1000).toISOString(),
        lastError: vs.last_error?.reason || null,
      }));

      res.json({ sessions, count: sessions.length });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get real-time balance and payouts from Stripe
  app.get("/api/admin/stripe/balance", requireAdmin, async (req: any, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      
      const balance = await stripe.balance.retrieve();
      
      res.json({
        available: balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency })),
        pending: balance.pending.map(b => ({ amount: b.amount / 100, currency: b.currency })),
      });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get all Stripe data in one call for dashboard - also syncs to database automatically
  app.get("/api/admin/stripe/all", requireAdmin, async (req: any, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const days = parseInt(req.query.days as string) || 7;
      const since = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

      // Fetch all data in parallel
      const [sessionsResult, identityResult, balanceResult] = await Promise.all([
        stripe.checkout.sessions.list({ limit: 100, created: { gte: since } }),
        stripe.identity.verificationSessions.list({ limit: 100, created: { gte: since } }).catch(() => ({ data: [] })),
        stripe.balance.retrieve(),
      ]);

      // Auto-sync wallet deposits and contributions to database
      let synced = 0;
      for (const session of sessionsResult.data) {
        if (session.payment_status !== 'paid') continue;
        const { type, userId, amount, poolId } = session.metadata || {};
        
        if (type === 'wallet_deposit' && userId && amount) {
          const success = await storage.createWalletDeposit(userId, amount, session.id);
          if (success) synced++;
        }
        
        if (poolId && amount && !type) {
          const guestEmail = session.customer_email || null;
          const contribution = await storage.createStripeContribution(poolId, amount, session.id, userId || null, guestEmail);
          if (contribution) synced++;
        }
      }

      // Auto-sync KYC status and verified data
      for (const vs of identityResult.data) {
        const userId = vs.metadata?.userId;
        if (!userId) continue;
        const user = await storage.getUser(userId);
        if (!user) continue;
        
        if (vs.status === 'verified') {
          // Fetch full session to get verified_outputs
          const fullSession = await stripe.identity.verificationSessions.retrieve(vs.id, {
            expand: ['verified_outputs'],
          }) as any;
          
          const verifiedOutputs = fullSession.verified_outputs;
          const updateData: any = { 
            kycStatus: 'verified',
            stripeIdentityVerificationId: vs.id,
          };
          
          // Only update if we don't already have the data or KYC wasn't verified
          if (user.kycStatus !== 'verified' || !user.verifiedAddress) {
            if (!user.kycVerifiedAt) {
              updateData.kycVerifiedAt = new Date(vs.created * 1000);
            }
            
            if (verifiedOutputs?.first_name || verifiedOutputs?.last_name) {
              updateData.verifiedLegalName = `${verifiedOutputs.first_name || ''} ${verifiedOutputs.last_name || ''}`.trim();
            }
            
            if (verifiedOutputs?.address) {
              const addr = verifiedOutputs.address;
              updateData.verifiedAddress = addr.line1 || '';
              updateData.verifiedCity = addr.city || '';
              updateData.verifiedState = addr.state || '';
              updateData.verifiedPostalCode = addr.postal_code || '';
              updateData.verifiedCountry = addr.country || '';
            }
            
            if (verifiedOutputs?.dob) {
              const dob = verifiedOutputs.dob;
              updateData.verifiedDob = `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`;
            }
            
            await storage.updateUser(userId, updateData);
            synced++;
            
            // Only send notification if just became verified
            if (user.kycStatus !== 'verified') {
              sendKycStatusNotification(
                user.email,
                user.phone,
                user.firstName,
                'verified',
                user.notifyEmail && user.emailKycUpdates,
                user.notifySMS && user.smsKycUpdates
              ).catch(console.error);
            }
          }
        }
      }

      const payments = sessionsResult.data
        .filter(s => s.payment_status === 'paid')
        .map(session => ({
          id: session.id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          type: session.metadata?.type || 'pool_contribution',
          userId: session.metadata?.userId || null,
          poolId: session.metadata?.poolId || null,
          customerEmail: session.customer_email,
          created: new Date(session.created * 1000).toISOString(),
        }));

      const identity = identityResult.data.map(vs => ({
        id: vs.id,
        status: vs.status,
        userId: vs.metadata?.userId || null,
        created: new Date(vs.created * 1000).toISOString(),
      }));

      res.json({
        payments,
        identity,
        balance: {
          available: balanceResult.available.map(b => ({ amount: b.amount / 100, currency: b.currency })),
          pending: balanceResult.pending.map(b => ({ amount: b.amount / 100, currency: b.currency })),
        },
        summary: {
          totalPayments: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
          walletDeposits: payments.filter(p => p.type === 'wallet_deposit').length,
          poolContributions: payments.filter(p => p.type === 'pool_contribution').length,
          verifiedKyc: identity.filter(i => i.status === 'verified').length,
          pendingKyc: identity.filter(i => i.status === 'requires_input').length,
        },
        synced,
      });
    } catch (error) {
      next(error);
    }
  });
  
  // User endpoint: Sync my wallet from Stripe (pulls real-time payment data)
  app.post("/api/wallet/sync", requireAuth, async (req: any, res, next) => {
    try {
      const userId = req.session.userId;
      const stripe = await getUncachableStripeClient();
      
      // Get all paid checkout sessions for this user
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) }, // Last 30 days
      });

      let synced = 0;
      for (const session of sessions.data) {
        if (session.payment_status !== 'paid') continue;
        const { type, userId: sessionUserId, amount } = session.metadata || {};
        
        if (type === 'wallet_deposit' && sessionUserId === userId && amount) {
          const success = await storage.createWalletDeposit(userId, amount, session.id);
          if (success) {
            synced++;
            console.log(`Synced wallet deposit for user ${userId}: $${amount}`);
          }
        }
      }

      // Get updated user balance
      const user = await storage.getUser(userId);
      
      res.json({ 
        success: true, 
        synced, 
        balance: user?.balance || "0",
        message: synced > 0 ? `Found and added ${synced} deposit(s) to your wallet` : "Wallet is up to date"
      });
    } catch (error) {
      next(error);
    }
  });

  // ========== ADMIN MERCURY/PAYOUT MANAGEMENT ==========

  // Get Mercury account info and balance (admin)
  app.get("/api/admin/mercury/account", requireAdmin, async (req, res, next) => {
    try {
      if (!hasMercuryCredentials()) {
        return res.status(400).json({ error: "Mercury not configured" });
      }
      
      const mercury = getMercuryClient();
      const account = await mercury.getAccount();
      const balance = await mercury.getAccountBalance();
      
      res.json({
        id: account.id,
        name: account.name,
        type: account.type,
        status: account.status,
        routingNumber: account.routingNumber,
        accountNumberLast4: account.accountNumber?.slice(-4),
        availableBalance: balance.available,
        currentBalance: balance.current,
      });
    } catch (error) {
      next(error);
    }
  });

  // List Mercury recipients (admin)
  app.get("/api/admin/mercury/recipients", requireAdmin, async (req, res, next) => {
    try {
      if (!hasMercuryCredentials()) {
        return res.status(400).json({ error: "Mercury not configured" });
      }
      
      const mercury = getMercuryClient();
      const { recipients } = await mercury.getRecipients();
      
      res.json(recipients.map(r => ({
        id: r.id,
        name: r.name,
        emails: r.emails,
        status: r.status,
        paymentMethod: r.paymentMethod,
        bankInfo: r.electronicRoutingInfo ? {
          routingNumber: r.electronicRoutingInfo.routingNumber,
          accountNumberLast4: r.electronicRoutingInfo.accountNumber?.slice(-4),
          bankName: r.electronicRoutingInfo.bankName,
          type: r.electronicRoutingInfo.electronicAccountType,
        } : null,
        dateLastPaid: r.dateLastPaid,
      })));
    } catch (error) {
      next(error);
    }
  });

  // ========== ADMIN MERCHANT MANAGEMENT ==========

  // List all merchants (admin)
  app.get("/api/admin/merchants", requireAdmin, async (req, res, next) => {
    try {
      const allMerchants = await db.select().from(merchants).orderBy(desc(merchants.createdAt));
      res.json(allMerchants);
    } catch (error) {
      next(error);
    }
  });

  // Get single merchant with analytics (admin)
  app.get("/api/admin/merchants/:id", requireAdmin, async (req, res, next) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Get checkout sessions for analytics
      const sessions = await storage.getMerchantCheckoutSessions(merchant.id);
      const apiKeys = await storage.getMerchantApiKeys(merchant.id);
      const payouts = await storage.getMerchantPayouts(merchant.id);

      // Get user info
      const user = await storage.getUser(merchant.userId);

      // Calculate analytics
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const pendingSessions = sessions.filter(s => s.status === 'pending' || s.status === 'collecting');
      const cancelledSessions = sessions.filter(s => s.status === 'cancelled' || s.status === 'expired');

      res.json({
        merchant,
        user: user ? { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName } : null,
        analytics: {
          totalSessions: sessions.length,
          completedSessions: completedSessions.length,
          pendingSessions: pendingSessions.length,
          cancelledSessions: cancelledSessions.length,
          totalVolume: merchant.totalVolume,
          totalFees: merchant.totalFees,
          totalPayouts: merchant.totalPayouts,
          pendingBalance: merchant.pendingBalance,
          conversionRate: sessions.length > 0 ? ((completedSessions.length / sessions.length) * 100).toFixed(1) : '0.0',
        },
        recentSessions: sessions.slice(0, 10),
        apiKeys: apiKeys.map(k => ({ id: k.id, name: k.name, keyPrefix: k.keyPrefix, isActive: k.isActive, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })),
        payouts: payouts.slice(0, 10),
      });
    } catch (error) {
      next(error);
    }
  });

  // Create merchant as admin
  app.post("/api/admin/merchants", requireAdmin, async (req: any, res, next) => {
    try {
      const schema = z.object({
        userId: z.string().min(1, "User ID is required"),
        companyName: z.string().min(1),
        website: z.string().url(),
        businessType: z.string().min(1),
        description: z.string().optional().transform(v => v === '' ? undefined : v),
        contactEmail: z.string().email(),
        contactPhone: z.string().optional().transform(v => v === '' ? undefined : v),
        webhookUrl: z.string().url().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional().default('approved'),
      });

      const data = schema.parse(req.body);

      // Verify target user exists
      const targetUser = await storage.getUser(data.userId);
      if (!targetUser) {
        return res.status(400).json({ error: "Selected user not found" });
      }

      const targetUserId = data.userId;

      // Check if user already has a merchant account
      const existingMerchant = await storage.getMerchantByUserId(targetUserId);
      if (existingMerchant) {
        return res.status(400).json({ error: "This user already has a merchant account" });
      }

      const crypto = await import('crypto');
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

      const merchant = await storage.createMerchant({
        userId: targetUserId,
        companyName: data.companyName,
        website: data.website,
        businessType: data.businessType,
        description: data.description ?? null,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone ?? null,
        webhookUrl: data.webhookUrl ?? null,
      });

      await storage.updateMerchant(merchant.id, { 
        webhookSecret,
        status: data.status,
      });

      // Log audit
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'create_merchant',
        targetType: 'merchant',
        targetId: merchant.id,
        details: `Created merchant: ${data.companyName} with status ${data.status}`,
        ipAddress: req.ip,
      });

      res.json({ merchant, message: "Merchant created successfully" });
    } catch (error: any) {
      console.error('Admin create merchant error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      next(error);
    }
  });

  // Approve merchant (admin)
  app.post("/api/admin/merchants/:id/approve", requireAdmin, async (req: any, res, next) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      await storage.updateMerchant(merchant.id, { status: 'approved' });

      // Log audit
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'approve_merchant',
        targetType: 'merchant',
        targetId: merchant.id,
        details: `Approved merchant: ${merchant.companyName}`,
        ipAddress: req.ip,
      });

      res.json({ message: "Merchant approved", status: 'approved' });
    } catch (error) {
      next(error);
    }
  });

  // Update merchant status (admin) - unified endpoint
  app.put("/api/admin/merchants/:id/status", requireAdmin, async (req: any, res, next) => {
    try {
      const { status } = req.body;
      if (!['pending', 'approved', 'suspended', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      await storage.updateMerchant(merchant.id, { status });

      // Log audit
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: `${status}_merchant`,
        targetType: 'merchant',
        targetId: merchant.id,
        details: `Updated merchant status to ${status}: ${merchant.companyName}`,
        ipAddress: req.ip,
      });

      res.json({ message: `Merchant ${status}`, status });
    } catch (error) {
      next(error);
    }
  });

  // Update merchant settings (admin) - fee percentage, webhook, etc.
  app.put("/api/admin/merchants/:id", requireAdmin, async (req: any, res, next) => {
    try {
      const schema = z.object({
        feePercent: z.string().optional(),
        webhookUrl: z.string().url().optional().or(z.literal('')).transform(v => v === '' ? null : v),
        companyName: z.string().min(1).optional(),
        website: z.string().url().optional(),
        businessType: z.string().min(1).optional(),
        description: z.string().optional().transform(v => v === '' ? null : v),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional().transform(v => v === '' ? null : v),
      });

      const data = schema.parse(req.body);
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Build update object with only provided fields
      const updates: any = {};
      if (data.feePercent !== undefined) updates.feePercent = data.feePercent;
      if (data.webhookUrl !== undefined) updates.webhookUrl = data.webhookUrl;
      if (data.companyName !== undefined) updates.companyName = data.companyName;
      if (data.website !== undefined) updates.website = data.website;
      if (data.businessType !== undefined) updates.businessType = data.businessType;
      if (data.description !== undefined) updates.description = data.description;
      if (data.contactEmail !== undefined) updates.contactEmail = data.contactEmail;
      if (data.contactPhone !== undefined) updates.contactPhone = data.contactPhone;

      await storage.updateMerchant(merchant.id, updates);

      // Log audit
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'update_merchant',
        targetType: 'merchant',
        targetId: merchant.id,
        details: `Updated merchant settings: ${Object.keys(updates).join(', ')}`,
        ipAddress: req.ip,
      });

      const updatedMerchant = await storage.getMerchant(merchant.id);
      res.json({ merchant: updatedMerchant, message: "Merchant updated successfully" });
    } catch (error: any) {
      console.error('Admin update merchant error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      next(error);
    }
  });

  // Suspend merchant (admin)
  app.post("/api/admin/merchants/:id/suspend", requireAdmin, async (req: any, res, next) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      await storage.updateMerchant(merchant.id, { status: 'suspended' });

      // Log audit
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'suspend_merchant',
        targetType: 'merchant',
        targetId: merchant.id,
        details: `Suspended merchant: ${merchant.companyName}`,
        ipAddress: req.ip,
      });

      res.json({ message: "Merchant suspended", status: 'suspended' });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // Fraud Detection API Routes
  // ============================================
  
  const { fraudDetection } = await import("./fraud-detection");

  app.get("/api/admin/fraud/dashboard", requireAdmin, async (req, res, next) => {
    try {
      const stats = await fraudDetection.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/fraud/alerts", requireAdmin, async (req, res, next) => {
    try {
      const { status, limit } = req.query;
      const alerts = await fraudDetection.getAlerts(status as string, parseInt(limit as string) || 50);
      
      const alertsWithUsers = await Promise.all(alerts.map(async (alert) => {
        if (alert.userId) {
          const [user] = await db.select().from(users).where(eq(users.id, alert.userId));
          return { ...alert, user: user ? { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName } : null };
        }
        return { ...alert, user: null };
      }));
      
      res.json({ alerts: alertsWithUsers });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/fraud/alerts/:id", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      if (!['reviewed', 'dismissed', 'confirmed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      await fraudDetection.reviewAlert(id, req.adminUser.id, status, notes);
      
      await db.insert(adminAuditLogs).values({
        adminId: req.adminUser.id,
        action: 'review_fraud_alert',
        targetType: 'fraud_alert',
        targetId: id,
        details: `Reviewed fraud alert: ${status}${notes ? ` - ${notes}` : ''}`,
        ipAddress: req.ip,
      });
      
      res.json({ message: "Alert updated" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/fraud/seed-sample", requireAdmin, async (req, res, next) => {
    try {
      // Create a sample fraud alert with detailed indicators from the fraud model
      const sampleIndicators = [
        "High velocity: 15 actions in 24h (limit: 10)",
        "Critical amount: $5,500 exceeds $5,000 threshold",
        "High daily volume: $8,750.00 approaching $10,000 limit",
        "New account: 3 days old (flagged for accounts under 7 days)",
        "KYC not completed",
        "Unusual time: 3:00 AM (suspicious hours: 1AM-5AM)"
      ];
      
      await db.insert(fraudAlerts).values({
        userId: null,
        transactionId: null,
        contributionId: null,
        riskLevel: 'critical',
        riskScore: 85,
        alertType: 'velocity_anomaly',
        description: 'Risk assessment flagged withdrawal of $5,500 from unverified account during unusual hours with high transaction velocity',
        indicators: JSON.stringify(sampleIndicators),
        status: 'pending',
        ipAddress: '192.168.1.100',
        deviceFingerprint: 'sample-device-fp-12345',
      });
      
      res.json({ message: "Sample fraud alert created" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/fraud/user/:userId", requireAdmin, async (req, res, next) => {
    try {
      const { userId } = req.params;
      const profile = await fraudDetection.getUserRiskProfile(userId);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // MFA API Routes
  // ============================================
  
  const { mfaService } = await import("./mfa-service");

  app.get("/api/mfa/status", requireAuth, async (req: any, res, next) => {
    try {
      const status = await mfaService.getMFAStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mfa/setup", requireAuth, async (req: any, res, next) => {
    try {
      const result = await mfaService.setupMFA(req.user!.id);
      res.json({ qrCode: result.qrCode, recoveryCodes: result.recoveryCodes });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mfa/enable", requireAuth, async (req: any, res, next) => {
    try {
      const { token } = req.body;
      if (!token || token.length !== 6) {
        return res.status(400).json({ error: "Invalid token" });
      }
      
      const success = await mfaService.enableMFA(req.user!.id, token);
      if (!success) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      res.json({ message: "MFA enabled successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mfa/disable", requireAuth, async (req: any, res, next) => {
    try {
      const { token } = req.body;
      if (!token || token.length !== 6) {
        return res.status(400).json({ error: "Invalid token" });
      }
      
      const success = await mfaService.disableMFA(req.user!.id, token);
      if (!success) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      res.json({ message: "MFA disabled successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mfa/verify", async (req, res, next) => {
    try {
      const { userId, token, recoveryCode } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];
      
      let success = false;
      if (recoveryCode) {
        success = await mfaService.useRecoveryCode(userId, recoveryCode, ipAddress, userAgent);
      } else if (token) {
        success = await mfaService.verifyMFA(userId, token, ipAddress, userAgent);
      } else {
        return res.status(400).json({ error: "Token or recovery code required" });
      }
      
      if (!success) {
        return res.status(401).json({ error: "Invalid code" });
      }
      
      res.json({ verified: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mfa/regenerate-codes", requireAuth, async (req: any, res, next) => {
    try {
      const { token } = req.body;
      if (!token || token.length !== 6) {
        return res.status(400).json({ error: "Invalid token" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
      if (!user?.twoFactorSecret) {
        return res.status(400).json({ error: "MFA not enabled" });
      }
      
      const { mfaService } = await import("./mfa-service");
      const isValid = mfaService.verifyToken(token, user.twoFactorSecret);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      const recoveryCodes = await mfaService.generateRecoveryCodes(req.user!.id);
      res.json({ recoveryCodes });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // Subscription API Routes (TBD - temporarily disabled)
  // ============================================

  // ============================================
  // Virtual Card Analytics API Routes
  // ============================================

  app.get("/api/card-analytics", requireAuth, async (req: any, res, next) => {
    try {
      const userPools = await db.select().from(pools).where(eq(pools.creatorId, req.user!.id));
      const poolIds = userPools.map(p => p.id);
      
      if (poolIds.length === 0) {
        return res.json({
          totalSpent: 0,
          transactionCount: 0,
          avgTransaction: 0,
          cardCount: 0,
          categoryBreakdown: [],
          monthlySpending: [],
          recentTransactions: [],
        });
      }
      
      const userCards = await db.select().from(virtualCards).where(sql`${virtualCards.poolId} IN ${poolIds}`);
      const cardIds = userCards.map(c => c.id);
      
      if (cardIds.length === 0) {
        return res.json({
          totalSpent: 0,
          transactionCount: 0,
          avgTransaction: 0,
          cardCount: 0,
          categoryBreakdown: [],
          monthlySpending: [],
          recentTransactions: [],
        });
      }
      
      const allTransactions = await db.select()
        .from(transactions)
        .where(sql`${transactions.virtualCardId} IN ${cardIds}`)
        .orderBy(desc(transactions.createdAt));
      
      const totalSpent = allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const transactionCount = allTransactions.length;
      const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;
      
      const categoryMap: Record<string, number> = {};
      allTransactions.forEach(t => {
        const category = t.merchant.split(' ')[0] || 'Other';
        categoryMap[category] = (categoryMap[category] || 0) + parseFloat(t.amount);
      });
      
      const categoryBreakdown = Object.entries(categoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
      
      const monthlyMap: Record<string, number> = {};
      allTransactions.forEach(t => {
        const monthKey = new Date(t.createdAt).toISOString().slice(0, 7);
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + parseFloat(t.amount);
      });
      
      const monthlySpending = Object.entries(monthlyMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);
      
      res.json({
        totalSpent,
        transactionCount,
        avgTransaction,
        cardCount: userCards.length,
        categoryBreakdown,
        monthlySpending,
        recentTransactions: allTransactions.slice(0, 20),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/card-analytics/pool/:poolId", requireAuth, async (req, res, next) => {
    try {
      const { poolId } = req.params;
      
      const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }
      
      const [card] = await db.select().from(virtualCards).where(eq(virtualCards.poolId, poolId));
      if (!card) {
        return res.json({
          pool,
          card: null,
          transactions: [],
          totalSpent: 0,
          remainingBalance: 0,
        });
      }
      
      const poolTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.virtualCardId, card.id))
        .orderBy(desc(transactions.createdAt));
      
      const totalSpent = poolTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const remainingBalance = parseFloat(card.balance);
      
      res.json({
        pool,
        card: { id: card.id, lastFour: card.lastFour, isActive: card.isActive, balance: card.balance },
        transactions: poolTransactions,
        totalSpent,
        remainingBalance,
      });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // GAMIFICATION & REWARDS ENDPOINTS
  // ============================================

  // Get all available badges
  app.get("/api/rewards/badges", requireAuth, async (req, res, next) => {
    try {
      const allBadges = await storage.getAllBadges();
      const userBadgesData = await storage.getUserBadges(req.session.userId!);
      const earnedBadgeIds = new Set(userBadgesData.map((ub: any) => ub.badgeId));
      
      const badgesWithStatus = allBadges.map(badge => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earnedAt: userBadgesData.find((ub: any) => ub.badgeId === badge.id)?.earnedAt || null,
      }));
      
      res.json(badgesWithStatus);
    } catch (error) {
      next(error);
    }
  });

  // Get user's earned badges
  app.get("/api/rewards/my-badges", requireAuth, async (req, res, next) => {
    try {
      const userBadgesData = await storage.getUserBadges(req.session.userId!);
      res.json(userBadgesData);
    } catch (error) {
      next(error);
    }
  });

  // Get user's points and stats
  app.get("/api/rewards/points", requireAuth, async (req, res, next) => {
    try {
      let points = await storage.getUserPoints(req.session.userId!);
      
      if (!points) {
        points = await storage.createUserPoints({
          userId: req.session.userId!,
          points: 0,
          lifetimePoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          level: 1,
        });
      }
      
      const pointsToNextLevel = ((points.level + 1) ** 2) * 100;
      const currentLevelPoints = (points.level ** 2) * 100;
      const progressToNextLevel = Math.round(
        ((points.lifetimePoints - currentLevelPoints) / (pointsToNextLevel - currentLevelPoints)) * 100
      );
      
      res.json({
        ...points,
        pointsToNextLevel,
        progressToNextLevel: Math.max(0, Math.min(100, progressToNextLevel)),
      });
    } catch (error) {
      next(error);
    }
  });

  // Get point transaction history
  app.get("/api/rewards/history", requireAuth, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getPointTransactions(req.session.userId!, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  // Get leaderboard
  app.get("/api/rewards/leaderboard", requireAuth, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      
      const userId = req.session.userId!;
      let userRank = leaderboard.findIndex(entry => entry.userId === userId) + 1;
      
      if (userRank === 0) {
        const userPoints = await storage.getUserPoints(userId);
        if (userPoints) {
          const fullLeaderboard = await storage.getLeaderboard(1000);
          userRank = fullLeaderboard.findIndex(entry => entry.userId === userId) + 1;
        }
      }
      
      res.json({
        leaderboard,
        userRank: userRank || null,
      });
    } catch (error) {
      next(error);
    }
  });

  // Initialize default badges (called once on startup or manually)
  app.post("/api/rewards/init-badges", requireAuth, async (req, res, next) => {
    try {
      const existingBadges = await storage.getAllBadges();
      if (existingBadges.length > 0) {
        return res.json({ message: "Badges already initialized", count: existingBadges.length });
      }

      const defaultBadges = [
        { name: "First Contribution", icon: "💰", color: "#10B981", description: "Made your first contribution to a pool", category: "contribution" as const, criteria: "first_contribution", threshold: 1, pointsAwarded: 50, rarity: "common" },
        { name: "Generous Giver", icon: "🎁", color: "#3B82F6", description: "Contributed $100+ total", category: "contribution" as const, criteria: "total_contributed_100", threshold: 100, pointsAwarded: 100, rarity: "uncommon" },
        { name: "Big Spender", icon: "💎", color: "#8B5CF6", description: "Contributed $500+ total", category: "contribution" as const, criteria: "total_contributed_500", threshold: 500, pointsAwarded: 250, rarity: "rare" },
        { name: "Whale", icon: "🐳", color: "#EC4899", description: "Contributed $1000+ total", category: "contribution" as const, criteria: "total_contributed_1000", threshold: 1000, pointsAwarded: 500, rarity: "epic" },
        { name: "Pool Creator", icon: "🏊", color: "#06B6D4", description: "Created your first pool", category: "pool" as const, criteria: "first_pool", threshold: 1, pointsAwarded: 50, rarity: "common" },
        { name: "Pool Master", icon: "👑", color: "#F59E0B", description: "Created 5+ pools", category: "pool" as const, criteria: "pools_created_5", threshold: 5, pointsAwarded: 150, rarity: "uncommon" },
        { name: "Pool Legend", icon: "🏆", color: "#EF4444", description: "Created 10+ pools", category: "pool" as const, criteria: "pools_created_10", threshold: 10, pointsAwarded: 300, rarity: "rare" },
        { name: "Goal Crusher", icon: "🎯", color: "#14B8A6", description: "Completed a pool goal", category: "milestone" as const, criteria: "pool_completed", threshold: 1, pointsAwarded: 100, rarity: "uncommon" },
        { name: "Social Butterfly", icon: "🦋", color: "#A855F7", description: "Following 10+ users", category: "social" as const, criteria: "following_10", threshold: 10, pointsAwarded: 50, rarity: "common" },
        { name: "Popular", icon: "⭐", color: "#FBBF24", description: "Have 10+ followers", category: "social" as const, criteria: "followers_10", threshold: 10, pointsAwarded: 100, rarity: "uncommon" },
        { name: "3-Day Streak", icon: "🔥", color: "#F97316", description: "Contributed for 3 days in a row", category: "streak" as const, criteria: "streak_3", threshold: 3, pointsAwarded: 30, rarity: "common" },
        { name: "Week Warrior", icon: "⚡", color: "#EAB308", description: "7-day contribution streak", category: "streak" as const, criteria: "streak_7", threshold: 7, pointsAwarded: 100, rarity: "uncommon" },
        { name: "Monthly Master", icon: "🌟", color: "#D946EF", description: "30-day contribution streak", category: "streak" as const, criteria: "streak_30", threshold: 30, pointsAwarded: 500, rarity: "legendary" },
        { name: "Early Adopter", icon: "🚀", color: "#6366F1", description: "Joined ChipIn early", category: "special" as const, criteria: "early_adopter", threshold: null, pointsAwarded: 100, rarity: "rare" },
        { name: "Verified", icon: "✅", color: "#22C55E", description: "Completed KYC verification", category: "milestone" as const, criteria: "kyc_verified", threshold: 1, pointsAwarded: 100, rarity: "common" },
      ];

      for (const badge of defaultBadges) {
        await storage.createBadge(badge);
      }

      res.json({ message: "Badges initialized", count: defaultBadges.length });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // Pay Me Back Links Routes
  // ============================================

  // Public endpoint to get user profile by username
  app.get("/api/users/username/:username", async (req, res, next) => {
    try {
      const username = req.params.username.toLowerCase().replace(/^@/, '');
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only public, non-sensitive data
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      });
    } catch (error) {
      next(error);
    }
  });

  // Public endpoint for guest payments to a user
  app.post("/api/pay/:username", async (req, res, next) => {
    try {
      const username = req.params.username.toLowerCase().replace(/^@/, '');
      
      const sanitizeMessage = (msg: string): string => {
        return msg
          .replace(/<[^>]*>/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .replace(/data:/gi, '')
          .trim()
          .substring(0, 500);
      };

      const paySchema = z.object({
        amount: z.number().min(1, "Minimum amount is $1").max(10000, "Maximum amount is $10,000"),
        message: z.string().max(500).optional().transform(val => val ? sanitizeMessage(val) : undefined),
        guestEmail: z.string().email("Invalid email format").optional().or(z.literal('')).transform(val => val || undefined),
        senderName: z.string().max(100).optional().transform(val => val ? val.replace(/<[^>]*>/g, '').trim().substring(0, 100) : undefined),
      });
      
      const { amount, message, guestEmail, senderName } = paySchema.parse(req.body);
      
      const recipient = await storage.getUserByUsername(username);
      if (!recipient) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Create a PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          type: 'pay_me_back',
          recipientId: recipient.id,
          recipientUsername: recipient.username,
          message: message || '',
          senderEmail: guestEmail || '',
          senderName: senderName || '',
        },
        receipt_email: guestEmail || undefined,
        description: `Payment to @${recipient.username}${message ? `: ${message.substring(0, 100)}` : ''}`,
      });

      // Create a pending transaction record
      await db.insert(payMeTransactions).values({
        recipientId: recipient.id,
        amount: amount.toFixed(2),
        message: message || null,
        senderEmail: guestEmail || null,
        senderName: senderName || null,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      next(error);
    }
  });

  // Confirm payment and update wallet balance
  app.post("/api/pay/:username/confirm", async (req, res, next) => {
    try {
      const username = req.params.username.toLowerCase().replace(/^@/, '');
      const { paymentIntentId } = z.object({
        paymentIntentId: z.string().min(1),
      }).parse(req.body);

      const recipient = await storage.getUserByUsername(username);
      if (!recipient) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Verify the payment intent status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Verify PaymentIntent belongs to this recipient
      if (paymentIntent.metadata?.recipientId !== recipient.id) {
        return res.status(403).json({ message: "Payment does not belong to this user" });
      }

      // Verify this is a pay_me_back transaction type
      if (paymentIntent.metadata?.type !== 'pay_me_back') {
        return res.status(400).json({ message: "Invalid payment type" });
      }

      // Find the transaction record - required for idempotency
      const [existingTransaction] = await db.select()
        .from(payMeTransactions)
        .where(eq(payMeTransactions.stripePaymentIntentId, paymentIntentId))
        .limit(1);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction record not found" });
      }

      // Idempotency check - don't credit if already completed
      if (existingTransaction.status === 'completed') {
        return res.json({ 
          message: "Payment already processed",
          amount: existingTransaction.amount,
        });
      }

      // Verify the transaction belongs to this recipient
      if (existingTransaction.recipientId !== recipient.id) {
        return res.status(403).json({ message: "Transaction does not belong to this user" });
      }

      const amount = paymentIntent.amount / 100; // Convert from cents

      // Use transaction for atomicity
      await db.transaction(async (tx) => {
        // Double-check status inside transaction for race condition prevention
        const [txRecord] = await tx.select()
          .from(payMeTransactions)
          .where(eq(payMeTransactions.id, existingTransaction.id))
          .limit(1);

        if (txRecord?.status === 'completed') {
          return; // Already processed
        }

        // Update transaction status first (marks as processed)
        await tx.update(payMeTransactions)
          .set({ status: 'completed' })
          .where(eq(payMeTransactions.id, existingTransaction.id));

        // Update recipient's wallet balance
        await tx.update(users)
          .set({ balance: sql`${users.balance} + ${amount}` })
          .where(eq(users.id, recipient.id));
      });

      // Send notification to recipient
      sendWalletActivityNotification(
        recipient.email,
        recipient.phone,
        recipient.firstName,
        'deposit',
        amount.toFixed(2),
        'completed',
        recipient.notifyEmail && recipient.emailWalletActivity,
        recipient.notifySMS && recipient.smsWalletActivity
      ).catch(console.error);

      res.json({ 
        message: "Payment successful",
        amount: amount.toFixed(2),
      });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // Push Notification Routes
  // ============================================

  // Get VAPID public key for client-side subscription
  app.get("/api/push/vapid-public-key", (req, res) => {
    try {
      const publicKey = getVapidPublicKey();
      res.json({ publicKey });
    } catch (error) {
      console.error('[Push] Failed to get VAPID key:', error);
      res.status(500).json({ error: "Push notifications not configured" });
    }
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", requireAuth, async (req, res, next) => {
    try {
      const { endpoint, p256dh, auth } = z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      }).parse(req.body);

      const userId = req.session.userId!;
      await savePushSubscription(userId, endpoint, p256dh, auth);
      
      // Enable push notifications for this user
      await storage.updateUser(userId, { notifyPush: true });

      res.json({ message: "Push subscription saved successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Unsubscribe from push notifications
  app.delete("/api/push/unsubscribe", requireAuth, async (req, res, next) => {
    try {
      const { endpoint } = z.object({
        endpoint: z.string(),
      }).parse(req.body);

      await removePushSubscription(endpoint);

      res.json({ message: "Push subscription removed" });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
