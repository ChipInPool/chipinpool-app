import { db } from "./db";
import { 
  users, pools, contributions, comments, notifications, virtualCards, transactions, follows, badges, userBadges, invites, walletDeposits, verificationCodes, bankAccounts, recurringContributions, apiAccessRequests,
  type User, type InsertUser, type Pool, type InsertPool, type Contribution, type InsertContribution,
  type Comment, type InsertComment, type Notification, type InsertNotification,
  type VirtualCard, type InsertVirtualCard, type Transaction, type InsertTransaction,
  type Invite, type InsertInvite, type RecurringContribution, type InsertRecurringContribution,
  type ApiAccessRequest, type InsertApiAccessRequest
} from "@shared/schema";
import { eq, desc, and, sql, gt, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: string, amount: string): Promise<void>;
  updateUserStats(id: string, poolsCreated?: number, totalContributed?: string): Promise<void>;
  
  // Pool operations
  getPool(id: string): Promise<Pool | undefined>;
  getPools(): Promise<Pool[]>;
  getPoolsByCreator(creatorId: string): Promise<Pool[]>;
  getPoolsByContributor(userId: string): Promise<Pool[]>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePool(id: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: Date }): Promise<Pool | undefined>;
  updatePoolAmount(id: string, amount: string): Promise<void>;
  updatePoolStatus(id: string, status: 'active' | 'completed' | 'expired'): Promise<void>;
  
  // Contribution operations
  getContributionsByPool(poolId: string): Promise<Contribution[]>;
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  getContributionByStripeSession(sessionId: string): Promise<Contribution | undefined>;
  createStripeContribution(poolId: string, amount: string, sessionId: string, userId?: string | null, guestEmail?: string | null): Promise<Contribution | null>;
  
  // Comment operations
  getCommentsByPool(poolId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  likeComment(id: string): Promise<void>;
  
  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Virtual Card operations
  getVirtualCardByPool(poolId: string): Promise<VirtualCard | undefined>;
  getVirtualCardById(id: string): Promise<VirtualCard | undefined>;
  createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard>;
  updateCardBalance(id: string, amount: string): Promise<void>;
  
  // Transaction operations
  getTransactionsByCard(virtualCardId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Badge operations
  getUserBadges(userId: string): Promise<any[]>;
  
  // Follow operations
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowing(userId: string): Promise<string[]>;
  getFollowers(userId: string): Promise<string[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  
  // Invite operations
  createInvite(invite: InsertInvite): Promise<Invite>;
  getPoolInvites(poolId: string): Promise<Invite[]>;
  updateInviteStatus(id: string, status: 'pending' | 'accepted' | 'declined'): Promise<void>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getFollowersWithDetails(userId: string): Promise<User[]>;
  
  // Recurring contribution operations
  createRecurringContribution(data: InsertRecurringContribution): Promise<RecurringContribution>;
  getRecurringContributionsByPool(poolId: string): Promise<RecurringContribution[]>;
  getRecurringContributionsByUser(userId: string): Promise<RecurringContribution[]>;
  updateRecurringContributionStatus(id: string, status: string): Promise<void>;
  cancelRecurringContribution(id: string): Promise<void>;
  
  // API access request operations
  createApiAccessRequest(data: InsertApiAccessRequest): Promise<ApiAccessRequest>;
  
  // User transaction history
  getUserTransactionHistory(userId: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBalance(id: string, amount: string): Promise<void> {
    await db.update(users).set({ balance: amount }).where(eq(users.id, id));
  }

  async updateUserStats(id: string, poolsCreated?: number, totalContributed?: string): Promise<void> {
    const updates: any = {};
    if (poolsCreated !== undefined) updates.poolsCreated = poolsCreated;
    if (totalContributed !== undefined) updates.totalContributed = totalContributed;
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  async getPool(id: string): Promise<Pool | undefined> {
    const [pool] = await db.select().from(pools).where(eq(pools.id, id));
    return pool;
  }

  async getPools(): Promise<Pool[]> {
    return await db.select().from(pools).orderBy(desc(pools.createdAt));
  }

  async getPoolsByCreator(creatorId: string): Promise<Pool[]> {
    return await db.select().from(pools).where(eq(pools.creatorId, creatorId)).orderBy(desc(pools.createdAt));
  }

  async getPoolsByContributor(userId: string): Promise<Pool[]> {
    const result = await db
      .select({ pool: pools })
      .from(contributions)
      .innerJoin(pools, eq(contributions.poolId, pools.id))
      .where(eq(contributions.userId, userId))
      .groupBy(pools.id);
    return result.map((r: any) => r.pool);
  }

  async createPool(insertPool: InsertPool): Promise<Pool> {
    const [pool] = await db.insert(pools).values(insertPool).returning();
    return pool;
  }

  async updatePool(id: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: Date }): Promise<Pool | undefined> {
    const updates: any = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.targetAmount !== undefined) updates.targetAmount = data.targetAmount;
    if (data.deadline !== undefined) updates.deadline = data.deadline;
    
    const [pool] = await db.update(pools).set(updates).where(eq(pools.id, id)).returning();
    return pool;
  }

  async updatePoolAmount(id: string, amount: string): Promise<void> {
    await db.update(pools).set({ 
      currentAmount: amount,
      updatedAt: new Date()
    }).where(eq(pools.id, id));
  }

  async updatePoolStatus(id: string, status: 'active' | 'completed' | 'expired'): Promise<void> {
    await db.update(pools).set({ status }).where(eq(pools.id, id));
  }

  async getContributionsByPool(poolId: string): Promise<Contribution[]> {
    return await db.select().from(contributions).where(eq(contributions.poolId, poolId)).orderBy(desc(contributions.createdAt));
  }

  async createContribution(insertContribution: InsertContribution): Promise<Contribution> {
    const [contribution] = await db.insert(contributions).values(insertContribution).returning();
    return contribution;
  }

  async getContributionByStripeSession(sessionId: string): Promise<Contribution | undefined> {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.stripeSessionId, sessionId));
    return contribution;
  }

  async createStripeContribution(poolId: string, amount: string, sessionId: string, userId?: string | null, guestEmail?: string | null): Promise<Contribution | null> {
    // Use transaction for atomic idempotence check + contribution + pool update
    return await db.transaction(async (tx) => {
      // Idempotence check inside transaction
      const [existing] = await tx.select().from(contributions).where(eq(contributions.stripeSessionId, sessionId));
      if (existing) {
        console.log(`Contribution already exists for session ${sessionId}`);
        return null;
      }

      // Create contribution
      const [contribution] = await tx.insert(contributions).values({
        poolId,
        userId: userId || null,
        amount,
        stripeSessionId: sessionId,
        guestEmail: guestEmail || null,
      }).returning();

      // Atomic increment of pool balance using SQL expression
      await tx.update(pools).set({ 
        currentAmount: sql`${pools.currentAmount} + ${amount}`,
        updatedAt: new Date()
      }).where(eq(pools.id, poolId));

      return contribution;
    });
  }

  async getCommentsByPool(poolId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.poolId, poolId)).orderBy(desc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async likeComment(id: string): Promise<void> {
    await db.update(comments).set({ 
      likes: sql`${comments.likes} + 1`
    }).where(eq(comments.id, id));
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(20);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getVirtualCardByPool(poolId: string): Promise<VirtualCard | undefined> {
    const [card] = await db.select().from(virtualCards).where(eq(virtualCards.poolId, poolId));
    return card;
  }

  async getVirtualCardById(id: string): Promise<VirtualCard | undefined> {
    const [card] = await db.select().from(virtualCards).where(eq(virtualCards.id, id));
    return card;
  }

  async createVirtualCard(insertCard: InsertVirtualCard): Promise<VirtualCard> {
    const [card] = await db.insert(virtualCards).values(insertCard).returning();
    return card;
  }

  async updateCardBalance(id: string, amount: string): Promise<void> {
    await db.update(virtualCards).set({ balance: amount }).where(eq(virtualCards.id, id));
  }

  async getTransactionsByCard(virtualCardId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.virtualCardId, virtualCardId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getUserBadges(userId: string): Promise<any[]> {
    const result = await db
      .select({ badge: badges })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
    return result.map((r: any) => r.badge);
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await db.insert(follows).values({ followerId, followingId });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(follows).where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      )
    );
  }

  async getFollowing(userId: string): Promise<string[]> {
    const result = await db.select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    return result.map(r => r.followingId);
  }

  async getFollowers(userId: string): Promise<string[]> {
    const result = await db.select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, userId));
    return result.map(r => r.followerId);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db.select().from(follows).where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      )
    );
    return !!result;
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const [invite] = await db.insert(invites).values(insertInvite).returning();
    return invite;
  }

  async getPoolInvites(poolId: string): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.poolId, poolId)).orderBy(desc(invites.createdAt));
  }

  async updateInviteStatus(id: string, status: 'pending' | 'accepted' | 'declined'): Promise<void> {
    await db.update(invites).set({ status }).where(eq(invites.id, id));
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async getFollowersWithDetails(userId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result.map(r => r.user);
  }

  async createWalletDeposit(userId: string, amount: string, sessionId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(walletDeposits).where(eq(walletDeposits.stripeSessionId, sessionId));
      if (existing) {
        console.log(`Wallet deposit already exists for session ${sessionId}`);
        return false;
      }

      await tx.insert(walletDeposits).values({
        userId,
        amount,
        stripeSessionId: sessionId,
      });

      await tx.update(users).set({ 
        balance: sql`${users.balance} + ${amount}`
      }).where(eq(users.id, userId));

      return true;
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async createVerificationCode(data: { userId: string; type: string; code: string; expiresAt: Date }): Promise<void> {
    await db.insert(verificationCodes).values(data);
  }

  async getValidVerificationCode(userId: string, type: string, code: string): Promise<{ id: string } | undefined> {
    const now = new Date();
    const [result] = await db.select({ id: verificationCodes.id })
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.type, type),
        eq(verificationCodes.code, code),
        eq(verificationCodes.used, false),
        gt(verificationCodes.expiresAt, now)
      ));
    return result;
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, id));
  }

  async createRecurringContribution(data: InsertRecurringContribution): Promise<RecurringContribution> {
    const [result] = await db.insert(recurringContributions).values(data).returning();
    return result;
  }

  async getRecurringContributionsByPool(poolId: string): Promise<RecurringContribution[]> {
    return await db.select().from(recurringContributions).where(eq(recurringContributions.poolId, poolId));
  }

  async getRecurringContributionsByUser(userId: string): Promise<RecurringContribution[]> {
    return await db.select().from(recurringContributions).where(eq(recurringContributions.userId, userId));
  }

  async updateRecurringContributionStatus(id: string, status: string): Promise<void> {
    await db.update(recurringContributions).set({ status }).where(eq(recurringContributions.id, id));
  }

  async cancelRecurringContribution(id: string): Promise<void> {
    await db.update(recurringContributions).set({ status: 'cancelled' }).where(eq(recurringContributions.id, id));
  }

  async createApiAccessRequest(data: InsertApiAccessRequest): Promise<ApiAccessRequest> {
    const [result] = await db.insert(apiAccessRequests).values(data).returning();
    return result;
  }

  async getUserTransactionHistory(userId: string): Promise<any[]> {
    const userPools = await db.select({ id: pools.id, title: pools.title })
      .from(pools)
      .where(eq(pools.creatorId, userId));

    if (userPools.length === 0) return [];

    const poolIds = userPools.map(p => p.id);
    const poolTitleMap = new Map(userPools.map(p => [p.id, p.title]));

    const cards = await db.select()
      .from(virtualCards)
      .where(inArray(virtualCards.poolId, poolIds));

    if (cards.length === 0) return [];

    const cardIds = cards.map(c => c.id);
    const cardPoolMap = new Map(cards.map(c => [c.id, c.poolId]));

    const allTransactions = await db.select()
      .from(transactions)
      .where(inArray(transactions.virtualCardId, cardIds))
      .orderBy(desc(transactions.createdAt));

    return allTransactions.map(t => ({
      ...t,
      poolId: cardPoolMap.get(t.virtualCardId),
      poolTitle: poolTitleMap.get(cardPoolMap.get(t.virtualCardId) || ''),
    }));
  }
}

export const storage = new DatabaseStorage();
