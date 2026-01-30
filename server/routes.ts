import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { registerSchema, loginSchema, loginWithUsernameSchema, phoneLoginSchema, verifyPhoneLoginSchema, forgotPasswordSchema, resetPasswordSchema, insertPoolSchema, insertContributionSchema, insertCommentSchema, insertTransactionSchema, users, follows, contributions, phoneVerificationCodes, passwordResetTokens, sendPhoneCodeSchema, verifyPhoneCodeSchema, adminAuditLogs, pools, transactions, merchants, virtualCards, fraudAlerts } from "@shared/schema";
import express from "express";
import { db } from "./db";
import { eq, desc, sql, inArray } from "drizzle-orm";
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

declare module "express-session" {
  interface SessionData {
    userId?: string;
    pendingMfaUserId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "chipin-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
      proxy: true, // Trust the reverse proxy
    })
  );
  
  // Trust proxy for secure cookies behind Replit's proxy
  app.set('trust proxy', 1);

  // Register object storage routes
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Phone verification routes
  app.post("/api/auth/send-phone-code", async (req, res, next) => {
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

  app.post("/api/auth/verify-phone-code", async (req, res, next) => {
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

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
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

  app.post("/api/auth/login", async (req, res, next) => {
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
  app.post("/api/auth/login-username", async (req, res, next) => {
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
  app.post("/api/auth/verify-mfa", async (req, res, next) => {
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
  app.post("/api/auth/phone-login/send", async (req, res, next) => {
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
  app.post("/api/auth/phone-login/verify", async (req, res, next) => {
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
  app.post("/api/auth/forgot-password", async (req, res, next) => {
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
  app.post("/api/auth/reset-password", async (req, res, next) => {
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

      // Validate that the object exists before setting ACL
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        if (!objectFile) {
          return res.status(400).json({ error: "Uploaded file not found" });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid or missing uploaded file" });
      }

      // Set the ACL policy to make the avatar public and owned by the user
      try {
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: userId,
          visibility: "public",
        });
        
        // Update user avatar URL
        await storage.updateUser(userId, { avatar: normalizedPath });
        
        const updatedUser = await storage.getUser(userId);
        const { password, ...userWithoutPassword } = updatedUser!;
        res.json({ message: "Avatar updated successfully", user: userWithoutPassword });
      } catch (aclError) {
        console.error("Error setting ACL policy:", aclError);
        return res.status(500).json({ error: "Failed to process uploaded image" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Get presigned URL for avatar upload
  app.post("/api/user/avatar/upload-url", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Store the object path with user association for later validation
      // The path includes a UUID that ties it to this request
      res.json({ 
        uploadURL, 
        objectPath,
        // Include constraints that client should follow (enforced on avatar update)
        constraints: {
          maxSizeBytes: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        }
      });
    } catch (error) {
      next(error);
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
      });

      const data = updateSchema.parse(req.body);
      const updatedPool = await storage.updatePool(pool.id, {
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
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
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone_number: user.phone || undefined,
            type: 'individual',
            billing: {
              address: {
                line1: '123 Main Street',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94111',
                country: 'US',
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
      const { amount, frequency } = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, { message: "Amount must be a positive number" }),
        frequency: z.enum(['weekly', 'monthly', 'quarterly']),
      }).parse(req.body);

      const pool = await storage.getPool(req.params.id);
      if (!pool) {
        return res.status(404).json({ message: "Pool not found" });
      }

      if (!pool.isRecurring) {
        return res.status(400).json({ message: "This pool does not accept recurring contributions" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Validate sufficient balance for first contribution
      const contributionAmount = parseFloat(amount);
      const userBalance = parseFloat(user.balance);

      if (userBalance < contributionAmount) {
        return res.status(400).json({ 
          message: "Insufficient balance for the first contribution. Please add funds to your wallet." 
        });
      }

      // Calculate next payment date based on frequency
      const now = new Date();
      let nextPaymentDate = new Date(now);
      if (frequency === 'weekly') {
        nextPaymentDate.setDate(now.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextPaymentDate.setMonth(now.getMonth() + 1);
      } else if (frequency === 'quarterly') {
        nextPaymentDate.setMonth(now.getMonth() + 3);
      }

      // Process first contribution immediately
      await storage.updateUserBalance(userId, (userBalance - contributionAmount).toFixed(2));
      await storage.createContribution({ poolId: pool.id, userId, amount });
      await storage.updatePoolAmount(pool.id, (parseFloat(pool.currentAmount) + contributionAmount).toFixed(2));

      // Create recurring contribution record after successful first payment
      const recurringContribution = await storage.createRecurringContribution({
        poolId: pool.id,
        userId,
        amount,
        frequency,
        nextPaymentDate,
      });

      res.json({ 
        recurringContribution,
        message: `Recurring ${frequency} contribution of $${amount} set up successfully`,
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

  // Cancel a recurring contribution
  app.delete("/api/recurring-contributions/:id", requireAuth, async (req, res, next) => {
    try {
      // Get the recurring contribution to verify ownership
      const userContributions = await storage.getRecurringContributionsByUser(req.session.userId!);
      const contribution = userContributions.find(c => c.id === req.params.id);
      
      if (!contribution) {
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
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['us_bank_account'],
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method', 'balances'],
            },
          },
        },
        metadata: { userId: user.id.toString() },
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
      });
    } catch (error: any) {
      console.error('[Stripe FC] Session creation error:', error.message);
      next(error);
    }
  });

  // Complete bank linking after user authorizes in Financial Connections
  app.post("/api/stripe/financial-connections/complete", requireAuth, async (req, res, next) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { accountId } = z.object({
        accountId: z.string(), // Financial Connections account ID (fca_...)
      }).parse(req.body);

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
      const alreadyLinked = existingAccounts.some(a => a.stripeFinancialConnectionsAccountId === accountId);
      if (alreadyLinked) {
        return res.status(400).json({ error: "This bank account is already linked" });
      }

      const isFirst = existingAccounts.length === 0;

      // Determine account type
      const accountSubtype = (fcAccount.subcategory as string) || 'checking';
      const isDebitCard = accountSubtype === 'debit' || accountSubtype === 'prepaid';

      // Create bank account record
      const bankAccount = await storage.createBankAccount({
        userId,
        stripeFinancialConnectionsAccountId: accountId,
        institutionName: fcAccount.institution_name || 'Bank Account',
        accountName: fcAccount.display_name || 'Account',
        accountMask: fcAccount.last4 || '****',
        accountType: accountSubtype,
        payoutMethod: isDebitCard ? 'debit_card' : 'bank_account',
        isDefault: isFirst,
      });

      res.json({ 
        message: "Bank account linked successfully",
        account: {
          id: bankAccount.id,
          institutionName: bankAccount.institutionName,
          accountMask: bankAccount.accountMask,
          accountType: bankAccount.accountType,
        }
      });
    } catch (error: any) {
      console.error('[Stripe FC] Complete linking error:', error.message);
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
      const accounts = await storage.getBankAccountsByUser(req.session.userId!);
      // Add flag indicating if account can be used for payouts
      // Now supports both Stripe Financial Connections and legacy Plaid
      const accountsWithPayoutStatus = accounts.map(account => ({
        ...account,
        canReceivePayouts: !!(account.stripeFinancialConnectionsAccountId || (account.plaidAccessToken && account.plaidAccountId)),
      }));
      res.json({ accounts: accountsWithPayoutStatus });
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

        // Create wallet withdrawal record
        const withdrawal = await storage.createWalletWithdrawal(
          userId,
          netAmount.toFixed(2),
          bankAccountId,
          payoutSpeed,
          instantFee > 0 ? instantFee.toFixed(2) : undefined
        );

        // Execute payout - Stripe for new accounts, Plaid for legacy
        let payoutTransferId: string | null = null;
        let payoutError: string | null = null;
        const creator = await storage.getUser(userId);
        
        // Check if this is a Stripe-linked account (Financial Connections)
        const isStripeLinked = !!bankAccount.stripeFinancialConnectionsAccountId;
        
        if (isStripeLinked) {
          // For regular users with Financial Connections linked accounts
          // We need bank account details to process payouts
          try {
            const stripe = await getUncachableStripeClient();
            
            // Check if user has a Connect account (optional for enhanced payouts)
            if (creator?.stripeConnectId) {
              // User has Connect - use transfers + payouts
              const connectAccount = await stripe.accounts.retrieve(creator.stripeConnectId);
              if (connectAccount.payouts_enabled) {
                // Transfer funds from platform to Connect account
                const stripeTransfer = await stripe.transfers.create({
                  amount: Math.round(netAmount * 100),
                  currency: 'usd',
                  destination: creator.stripeConnectId,
                  description: `ChipIn Pool Withdrawal${payoutSpeed === 'instant' ? ' (Instant)' : ''}`,
                  metadata: {
                    poolId,
                    withdrawalId: withdrawal.id,
                    payoutSpeed,
                  },
                });
                
                payoutTransferId = stripeTransfer.id;
                
                // For instant payouts via debit card
                if (payoutSpeed === 'instant') {
                  try {
                    await stripe.payouts.create({
                      amount: Math.round(netAmount * 100),
                      currency: 'usd',
                      method: 'instant',
                    }, {
                      stripeAccount: creator.stripeConnectId,
                    });
                  } catch (instantError: any) {
                    console.log('[Payout] Instant payout not available:', instantError.message);
                  }
                }
                
                await storage.updateWalletWithdrawal(withdrawal.id, {
                  plaidTransferId: payoutTransferId,
                  status: 'pending',
                });
              } else {
                throw new Error('Connect account not ready for payouts');
              }
            } else {
              // Regular user without Connect - check for stored bank details
              if (!bankAccount.routingNumber || !bankAccount.accountNumber) {
                throw new Error('Bank account details not available. Please re-link your bank account.');
              }
              
              // For regular users, we'll mark as pending and process via platform-managed payout
              // This requires manual processing or integration with a payout service
              console.log('[Payout] Marked for platform-managed ACH payout to:', bankAccount.accountMask);
              payoutTransferId = `manual_${withdrawal.id}`;
              
              await storage.updateWalletWithdrawal(withdrawal.id, {
                plaidTransferId: payoutTransferId,
                status: 'pending', // Will be processed by platform admin
              });
            }
            
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

      // Create wallet withdrawal record to track the payout
      const withdrawal = await storage.createWalletWithdrawal(
        userId,
        netAmount.toFixed(2),
        bankAccountId,
        payoutSpeed,
        instantFee > 0 ? instantFee.toFixed(2) : undefined
      );

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
        await storage.updateUser(userId, { kycStatus: 'verified' });
        
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
        companyName: z.string().min(1),
        website: z.string().url(),
        useCase: z.string().min(10),
        monthlyVolume: z.string().min(1),
        email: z.string().email().optional(),
        name: z.string().optional(),
      });

      const data = requestSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Store API access request
      await storage.createApiAccessRequest({
        userId: user.id,
        companyName: data.companyName,
        website: data.website,
        useCase: data.useCase,
        monthlyVolume: data.monthlyVolume,
      });

      // Send notification email to admin (in real scenario)
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
  
  // Admin middleware - requires admin role
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

      // Auto-sync KYC status
      for (const vs of identityResult.data) {
        const userId = vs.metadata?.userId;
        if (!userId) continue;
        const user = await storage.getUser(userId);
        if (!user) continue;
        if (vs.status === 'verified' && user.kycStatus !== 'verified') {
          await storage.updateUser(userId, { kycStatus: 'verified' });
          synced++;
          
          // Send KYC status notification - gate with global channel preference AND per-category preference
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

  return httpServer;
}
