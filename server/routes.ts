import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { registerSchema, loginSchema, insertPoolSchema, insertContributionSchema, insertCommentSchema, insertTransactionSchema, users, follows, contributions } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendPoolInviteEmail } from "./resendClient";
import { sendPoolInviteSMS } from "./clicksendClient";
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
  sendWelcomeEmail
} from "./notificationService";

declare module "express-session" {
  interface SessionData {
    userId?: string;
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
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      
      // Send welcome email asynchronously
      sendWelcomeEmail(user.email, user.name).catch(err => 
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

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
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
            poolCreator.name,
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
        message: `${user.name} chipped in $${amount} to ${pool.title}`,
        link: `/pool/${pool.id}`,
      });

      // Send email/SMS notification for contribution (only if contributor is not the pool creator)
      if (poolCreator && pool.creatorId !== user.id) {
        sendPoolContributionNotification(
          poolCreator.email,
          poolCreator.phone,
          poolCreator.name,
          user.name,
          pool.id,
          pool.title,
          amount,
          poolCreator.notifyEmail,
          poolCreator.notifySMS
        ).catch(err => console.error('[Notification] Contribution notification failed:', err));
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
      const { amount } = z.object({ amount: z.string() }).parse(req.body);
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

      res.json({ message: "Withdrawal successful", balance: newBalance });
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
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

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
            name: user.name,
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
    } catch (error) {
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
              message: `${inviter.name} invited you to join "${pool.title}"`,
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
          await sendPoolInviteEmail(recipient, inviter.name, pool.title, poolUrl);

          if (existingUser) {
            const notification = await storage.createNotification({
              userId: existingUser.id,
              type: 'pool_invite',
              title: 'Pool Invitation',
              message: `${inviter.name} invited you to join "${pool.title}"`,
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
          await sendPoolInviteSMS(recipient, inviter.name, pool.title, poolUrl);

          if (existingUser) {
            const notification = await storage.createNotification({
              userId: existingUser.id,
              type: 'pool_invite',
              title: 'Pool Invitation',
              message: `${inviter.name} invited you to join "${pool.title}"`,
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
      res.json({ publishableKey });
    } catch (error) {
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
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

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
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

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

      const linkTokenResponse = await plaidClient.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: 'ChipInPay',
        products: [Products.Auth],
        country_codes: [CountryCode.Us],
        language: 'en',
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

  // Exchange public token for access token
  app.post("/api/plaid/exchange-token", requireAuth, async (req, res, next) => {
    try {
      const { publicToken, accountId } = z.object({
        publicToken: z.string(),
        accountId: z.string(),
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

      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = exchangeResponse.data.access_token;
      
      // Store access token and account ID
      await storage.updateUser(req.session.userId!, {
        plaidAccessToken: accessToken,
        plaidAccountId: accountId,
      });

      res.json({ message: "Bank account linked successfully" });
    } catch (error: any) {
      console.error('[Plaid] Token exchange error:', error.message);
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
      // For now, we simulate the withdrawal
      const newBalance = (currentBalance - withdrawAmount).toFixed(2);
      await storage.updateUser(userId, { balance: newBalance });

      res.json({ 
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} initiated. Funds will arrive in 1-3 business days.`,
        newBalance,
      });
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
      
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: { userId },
        options: {
          document: {
            require_matching_selfie: true,
          },
        },
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
            userName: user?.name || 'Anonymous',
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
          smsContributions: user.notifySMS,
          smsPoolComplete: user.notifySMS,
          smsInvites: user.notifySMS,
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
        smsContributions: z.boolean().optional(),
        smsPoolComplete: z.boolean().optional(),
        smsInvites: z.boolean().optional(),
      });

      const prefs = prefsSchema.parse(req.body);
      const userId = req.session.userId!;

      // Determine overall email/sms preferences based on individual settings
      // Only set to true if at least one flag is explicitly true
      // Set to false if all flags are explicitly false
      const hasEmailPrefs = prefs.emailContributions !== undefined || prefs.emailPoolUpdates !== undefined || 
                            prefs.emailPoolComplete !== undefined || prefs.emailInvites !== undefined;
      const hasSmsPrefs = prefs.smsContributions !== undefined || prefs.smsPoolComplete !== undefined || 
                          prefs.smsInvites !== undefined;

      const notifyEmail = hasEmailPrefs ? Boolean(prefs.emailContributions || prefs.emailPoolUpdates || 
                                                   prefs.emailPoolComplete || prefs.emailInvites) : undefined;
      const notifySMS = hasSmsPrefs ? Boolean(prefs.smsContributions || prefs.smsPoolComplete || 
                                               prefs.smsInvites) : undefined;

      const updateData: Record<string, boolean> = {};
      if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail;
      if (notifySMS !== undefined) updateData.notifySMS = notifySMS;

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

  return httpServer;
}
