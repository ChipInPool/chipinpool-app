import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { registerSchema, loginSchema, insertPoolSchema, insertContributionSchema, insertCommentSchema, insertTransactionSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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
      const data = insertPoolSchema.parse({
        ...req.body,
        creatorId: req.session.userId,
      });

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
      }

      // Create notification for pool creator
      await storage.createNotification({
        userId: pool.creatorId,
        type: 'contribution',
        title: 'New Contribution',
        message: `${user.name} chipped in $${amount} to ${pool.title}`,
        link: `/pool/${pool.id}`,
      });

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

      let card = await storage.getVirtualCardByPool(pool.id);
      
      // Create virtual card if it doesn't exist
      if (!card) {
        const cardNumber = `4922${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
        const cvc = Math.floor(Math.random() * 900 + 100).toString();
        const expiry = "05/28";
        
        card = await storage.createVirtualCard({
          poolId: pool.id,
          cardNumber,
          expiry,
          cvc,
          balance: pool.currentAmount,
        });
      }

      res.json({ card });
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

  return httpServer;
}
