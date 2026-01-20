import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { registerSchema, loginSchema, insertPoolSchema, insertContributionSchema, insertCommentSchema, insertTransactionSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";

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

      const card = await storage.getVirtualCardByPool(data.virtualCardId);
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

  app.post("/api/users/:id/unfollow", requireAuth, async (req, res, next) => {
    try {
      await storage.unfollowUser(req.session.userId!, req.params.id);
      res.json({ message: "User unfollowed" });
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

  return httpServer;
}
