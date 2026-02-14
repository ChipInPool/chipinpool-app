import { db } from "./db";
import { 
  users, pools, contributions, comments, notifications, virtualCards, transactions, follows, badges, userBadges, invites, walletDeposits, walletWithdrawals, verificationCodes, bankAccounts, recurringContributions, apiAccessRequests,
  merchants, merchantApiKeys, merchantCheckoutSessions, merchantWebhookDeliveries, merchantPayouts, poolTransferRequests,
  userPoints, pointTransactions, poolActivities, userFollows,
  type User, type InsertUser, type Pool, type InsertPool, type Contribution, type InsertContribution,
  type Comment, type InsertComment, type Notification, type InsertNotification,
  type VirtualCard, type InsertVirtualCard, type Transaction, type InsertTransaction,
  type Invite, type InsertInvite, type RecurringContribution, type InsertRecurringContribution,
  type ApiAccessRequest, type InsertApiAccessRequest,
  type Merchant, type InsertMerchant, type MerchantApiKey, type InsertMerchantApiKey,
  type MerchantCheckoutSession, type InsertMerchantCheckoutSession,
  type MerchantWebhookDelivery, type InsertMerchantWebhookDelivery,
  type MerchantPayout, type InsertMerchantPayout,
  type BankAccount, type InsertBankAccount, type PoolTransferRequest, type InsertPoolTransferRequest,
  type Badge, type InsertBadge, type UserBadge, type InsertUserBadge,
  type UserPoints, type InsertUserPoints, type PointTransaction, type InsertPointTransaction,
  type PoolActivity, type InsertPoolActivity,
  type UserFollow
} from "@shared/schema";
import { eq, desc, and, sql, gt, lte, inArray, or, ilike, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: string, amount: string): Promise<void>;
  updateUserStats(id: string, poolsCreated?: number, totalContributed?: string): Promise<void>;
  
  // Pool operations
  getPool(id: string): Promise<Pool | undefined>;
  getPools(): Promise<Pool[]>;
  getPoolsByCreator(creatorId: string): Promise<Pool[]>;
  getPoolsByContributor(userId: string): Promise<Pool[]>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePool(id: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: Date; image?: string; emoji?: string; externalLink?: string; isPublic?: boolean; status?: 'active' | 'completed' | 'expired' | 'closed' | 'paused' | 'archived' }): Promise<Pool | undefined>;
  updatePoolAmount(id: string, amount: string): Promise<void>;
  updatePoolStatus(id: string, status: 'active' | 'completed' | 'expired' | 'closed' | 'paused' | 'archived'): Promise<void>;
  archivePool(id: string): Promise<Pool | undefined>;
  unarchivePool(id: string): Promise<Pool | undefined>;
  getArchivedPools(userId: string): Promise<Pool[]>;
  autoArchiveClosedPools(daysThreshold: number): Promise<number>;
  
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
  getAllBadges(): Promise<Badge[]>;
  getBadgeById(id: string): Promise<Badge | undefined>;
  getBadgeByCriteria(criteria: string): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  awardBadge(userId: string, badgeId: string): Promise<UserBadge | undefined>;
  hasBadge(userId: string, badgeId: string): Promise<boolean>;
  
  // Points operations
  getUserPoints(userId: string): Promise<UserPoints | undefined>;
  createUserPoints(data: InsertUserPoints): Promise<UserPoints>;
  addPoints(userId: string, points: number, reason: string, referenceType?: string, referenceId?: string): Promise<UserPoints>;
  getPointTransactions(userId: string, limit?: number): Promise<PointTransaction[]>;
  getLeaderboard(limit?: number): Promise<any[]>;
  
  // Follow operations (legacy - uses follows table)
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowing(userId: string): Promise<string[]>;
  getFollowers(userId: string): Promise<string[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // User following (new - uses userFollows table)
  followUserNew(followerId: string, followingId: string): Promise<UserFollow>;
  unfollowUserNew(followerId: string, followingId: string): Promise<void>;
  getFollowersDetailed(userId: string, limit?: number, offset?: number): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; createdAt: Date}[]>;
  getFollowingDetailed(userId: string, limit?: number, offset?: number): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; createdAt: Date}[]>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  isFollowingNew(followerId: string, followingId: string): Promise<boolean>;
  searchUsers(query: string, limit?: number): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; isPublic: boolean; createdAt: Date}[]>;
  
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
  getRecurringContributionById(id: string): Promise<RecurringContribution | undefined>;
  getDueRecurringContributions(): Promise<RecurringContribution[]>;
  updateRecurringContribution(id: string, data: { amount?: string; frequency?: 'weekly' | 'monthly' | 'quarterly'; status?: string; nextPaymentDate?: Date }): Promise<RecurringContribution | undefined>;
  updateRecurringContributionStatus(id: string, status: string): Promise<void>;
  cancelRecurringContribution(id: string): Promise<void>;
  
  // API access request operations
  createApiAccessRequest(data: InsertApiAccessRequest): Promise<ApiAccessRequest>;
  
  // User transaction history
  getUserTransactionHistory(userId: string): Promise<any[]>;

  // Merchant operations
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByUserId(userId: string): Promise<Merchant | undefined>;
  getMerchantByApiKey(keyHash: string): Promise<Merchant | undefined>;
  updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined>;
  
  // Merchant API key operations
  createMerchantApiKey(apiKey: InsertMerchantApiKey): Promise<MerchantApiKey>;
  getMerchantApiKeys(merchantId: string): Promise<MerchantApiKey[]>;
  getMerchantApiKeyByPrefix(prefix: string): Promise<MerchantApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deactivateApiKey(id: string): Promise<void>;
  
  // Merchant checkout session operations
  createMerchantCheckoutSession(session: InsertMerchantCheckoutSession): Promise<MerchantCheckoutSession>;
  getMerchantCheckoutSession(id: string): Promise<MerchantCheckoutSession | undefined>;
  getMerchantCheckoutSessionByOrderId(merchantId: string, orderId: string): Promise<MerchantCheckoutSession | undefined>;
  getMerchantCheckoutSessionByPoolId(poolId: string): Promise<MerchantCheckoutSession | undefined>;
  getMerchantCheckoutSessions(merchantId: string): Promise<MerchantCheckoutSession[]>;
  updateCheckoutSessionStatus(id: string, status: string, collectedAmount?: string): Promise<void>;
  updateCheckoutSessionPool(id: string, poolId: string): Promise<void>;
  getExpiredCheckoutSessions(): Promise<MerchantCheckoutSession[]>;
  updateMerchantStats(merchantId: string, netAmount: number, feeAmount: number, totalAmount: number): Promise<void>;
  
  // Merchant webhook operations
  createWebhookDelivery(delivery: InsertMerchantWebhookDelivery): Promise<MerchantWebhookDelivery>;
  updateWebhookDelivery(id: string, responseStatus: number, responseBody: string, delivered: boolean): Promise<void>;
  
  // Merchant payout operations
  createMerchantPayout(payout: InsertMerchantPayout): Promise<MerchantPayout>;
  getMerchantPayouts(merchantId: string): Promise<MerchantPayout[]>;

  // Bank account operations
  getBankAccountsByUser(userId: string): Promise<BankAccount[]>;
  getBankAccountById(id: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  setDefaultBankAccount(userId: string, accountId: string): Promise<void>;
  deleteBankAccount(userId: string, accountId: string): Promise<void>;
  getBankAccountByStripeAccountId(stripeAccountId: string): Promise<BankAccount | undefined>;
  updateBankAccountByStripeAccountId(stripeAccountId: string, updates: Partial<BankAccount>): Promise<BankAccount | undefined>;
  updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount | undefined>;

  // Pool transfer request operations
  createPoolTransferRequest(request: InsertPoolTransferRequest): Promise<PoolTransferRequest>;
  getPoolTransferRequest(id: string): Promise<PoolTransferRequest | undefined>;
  getPoolTransferRequestsByPool(poolId: string): Promise<PoolTransferRequest[]>;
  getPoolTransferRequestsByUser(userId: string): Promise<PoolTransferRequest[]>;
  getPendingTransferRequestsForUser(userId: string): Promise<PoolTransferRequest[]>;
  updatePoolTransferRequest(id: string, data: Partial<PoolTransferRequest>): Promise<PoolTransferRequest | undefined>;

  // Pool activity operations
  createPoolActivity(activity: InsertPoolActivity): Promise<PoolActivity>;
  getPoolActivities(poolId: string): Promise<PoolActivity[]>;
  updatePoolSpentAmount(poolId: string, amount: string): Promise<void>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async updatePool(id: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: Date; image?: string; emoji?: string; externalLink?: string; isPublic?: boolean; status?: 'active' | 'completed' | 'expired' | 'closed' | 'paused' | 'archived' }): Promise<Pool | undefined> {
    const updates: any = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.targetAmount !== undefined) updates.targetAmount = data.targetAmount;
    if (data.deadline !== undefined) updates.deadline = data.deadline;
    if (data.image !== undefined) updates.image = data.image;
    if (data.emoji !== undefined) updates.emoji = data.emoji;
    if (data.externalLink !== undefined) updates.externalLink = data.externalLink;
    if (data.isPublic !== undefined) updates.isPublic = data.isPublic;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'closed') updates.closedAt = new Date();
      if (data.status === 'archived') updates.archivedAt = new Date();
    }
    
    const [pool] = await db.update(pools).set(updates).where(eq(pools.id, id)).returning();
    return pool;
  }

  async updatePoolAmount(id: string, amount: string): Promise<void> {
    await db.update(pools).set({ 
      currentAmount: amount,
      updatedAt: new Date()
    }).where(eq(pools.id, id));
  }

  async updatePoolStatus(id: string, status: 'active' | 'completed' | 'expired' | 'closed' | 'paused' | 'archived'): Promise<void> {
    const updates: any = { status };
    if (status === 'closed') updates.closedAt = new Date();
    if (status === 'archived') updates.archivedAt = new Date();
    await db.update(pools).set(updates).where(eq(pools.id, id));
  }

  async archivePool(id: string): Promise<Pool | undefined> {
    const [pool] = await db.update(pools).set({
      status: 'archived',
      archivedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(pools.id, id)).returning();
    return pool;
  }

  async unarchivePool(id: string): Promise<Pool | undefined> {
    const [pool] = await db.update(pools).set({
      status: 'closed',
      archivedAt: null,
      updatedAt: new Date(),
    }).where(eq(pools.id, id)).returning();
    return pool;
  }

  async getArchivedPools(userId: string): Promise<Pool[]> {
    return await db.select().from(pools)
      .where(and(eq(pools.creatorId, userId), eq(pools.status, 'archived')))
      .orderBy(desc(pools.archivedAt));
  }

  async autoArchiveClosedPools(daysThreshold: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    
    const result = await db.update(pools).set({
      status: 'archived',
      archivedAt: new Date(),
      updatedAt: new Date(),
    }).where(
      and(
        eq(pools.status, 'closed'),
        lte(pools.closedAt, cutoffDate)
      )
    ).returning();
    return result.length;
  }

  async getContributionsByPool(poolId: string): Promise<Contribution[]> {
    return await db.select().from(contributions).where(eq(contributions.poolId, poolId)).orderBy(desc(contributions.createdAt));
  }

  async getUserContributions(userId: string): Promise<Contribution[]> {
    return await db.select().from(contributions).where(eq(contributions.userId, userId)).orderBy(desc(contributions.createdAt));
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

  async createWalletWithdrawal(
    userId: string, 
    amount: string, 
    bankAccountId?: string,
    payoutSpeed: 'standard' | 'instant' = 'standard',
    instantFee?: string
  ): Promise<{ id: string }> {
    const [withdrawal] = await db.insert(walletWithdrawals).values({
      userId,
      amount,
      bankAccountId: bankAccountId || null,
      payoutSpeed,
      instantFee: instantFee || null,
      status: "pending",
    }).returning();
    return withdrawal;
  }

  async updateWalletWithdrawalStatus(id: string, status: string): Promise<void> {
    await db.update(walletWithdrawals).set({ status }).where(eq(walletWithdrawals.id, id));
  }

  async updateWalletWithdrawal(id: string, data: { status?: string; plaidTransferId?: string }): Promise<void> {
    await db.update(walletWithdrawals).set(data).where(eq(walletWithdrawals.id, id));
  }

  async getWalletHistory(userId: string): Promise<{ deposits: any[]; withdrawals: any[] }> {
    const deposits = await db.select().from(walletDeposits)
      .where(eq(walletDeposits.userId, userId))
      .orderBy(desc(walletDeposits.createdAt));
    
    const withdrawals = await db.select().from(walletWithdrawals)
      .where(eq(walletWithdrawals.userId, userId))
      .orderBy(desc(walletWithdrawals.createdAt));
    
    return { deposits, withdrawals };
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

  async getRecurringContributionById(id: string): Promise<RecurringContribution | undefined> {
    const [result] = await db.select().from(recurringContributions).where(eq(recurringContributions.id, id));
    return result;
  }

  async getDueRecurringContributions(): Promise<RecurringContribution[]> {
    const now = new Date();
    return await db.select()
      .from(recurringContributions)
      .where(
        and(
          eq(recurringContributions.status, 'active'),
          sql`${recurringContributions.nextPaymentDate} <= ${now}`
        )
      );
  }

  async updateRecurringContribution(id: string, data: { amount?: string; frequency?: 'weekly' | 'monthly' | 'quarterly'; status?: string; nextPaymentDate?: Date }): Promise<RecurringContribution | undefined> {
    const updates: any = {};
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.frequency !== undefined) updates.frequency = data.frequency;
    if (data.status !== undefined) updates.status = data.status;
    if (data.nextPaymentDate !== undefined) updates.nextPaymentDate = data.nextPaymentDate;
    
    const [result] = await db.update(recurringContributions).set(updates).where(eq(recurringContributions.id, id)).returning();
    return result;
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

  // Merchant operations
  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const [result] = await db.insert(merchants).values(merchant).returning();
    return result;
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [result] = await db.select().from(merchants).where(eq(merchants.id, id));
    return result;
  }

  async getMerchantByUserId(userId: string): Promise<Merchant | undefined> {
    const [result] = await db.select().from(merchants).where(eq(merchants.userId, userId));
    return result;
  }

  async getMerchantByApiKey(keyHash: string): Promise<Merchant | undefined> {
    const [apiKey] = await db.select().from(merchantApiKeys)
      .where(and(eq(merchantApiKeys.keyHash, keyHash), eq(merchantApiKeys.isActive, true)));
    if (!apiKey) return undefined;
    return this.getMerchant(apiKey.merchantId);
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const [result] = await db.update(merchants).set(data).where(eq(merchants.id, id)).returning();
    return result;
  }

  // Merchant API key operations
  async createMerchantApiKey(apiKey: InsertMerchantApiKey): Promise<MerchantApiKey> {
    const [result] = await db.insert(merchantApiKeys).values(apiKey).returning();
    return result;
  }

  async getMerchantApiKeys(merchantId: string): Promise<MerchantApiKey[]> {
    return db.select().from(merchantApiKeys).where(eq(merchantApiKeys.merchantId, merchantId)).orderBy(desc(merchantApiKeys.createdAt));
  }

  async getMerchantApiKeyByPrefix(prefix: string): Promise<MerchantApiKey | undefined> {
    const [result] = await db.select().from(merchantApiKeys)
      .where(and(eq(merchantApiKeys.keyPrefix, prefix), eq(merchantApiKeys.isActive, true)));
    return result;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(merchantApiKeys).set({ lastUsedAt: new Date() }).where(eq(merchantApiKeys.id, id));
  }

  async deactivateApiKey(id: string): Promise<void> {
    await db.update(merchantApiKeys).set({ isActive: false }).where(eq(merchantApiKeys.id, id));
  }

  // Merchant checkout session operations
  async createMerchantCheckoutSession(session: InsertMerchantCheckoutSession): Promise<MerchantCheckoutSession> {
    const [result] = await db.insert(merchantCheckoutSessions).values(session).returning();
    return result;
  }

  async getMerchantCheckoutSession(id: string): Promise<MerchantCheckoutSession | undefined> {
    const [result] = await db.select().from(merchantCheckoutSessions).where(eq(merchantCheckoutSessions.id, id));
    return result;
  }

  async getMerchantCheckoutSessionByOrderId(merchantId: string, orderId: string): Promise<MerchantCheckoutSession | undefined> {
    const [result] = await db.select().from(merchantCheckoutSessions)
      .where(and(eq(merchantCheckoutSessions.merchantId, merchantId), eq(merchantCheckoutSessions.externalOrderId, orderId)));
    return result;
  }

  async getMerchantCheckoutSessions(merchantId: string): Promise<MerchantCheckoutSession[]> {
    return db.select().from(merchantCheckoutSessions)
      .where(eq(merchantCheckoutSessions.merchantId, merchantId))
      .orderBy(desc(merchantCheckoutSessions.createdAt));
  }

  async updateCheckoutSessionStatus(id: string, status: string, collectedAmount?: string): Promise<void> {
    const updateData: any = { status };
    if (collectedAmount) updateData.collectedAmount = collectedAmount;
    if (status === 'completed') updateData.completedAt = new Date();
    await db.update(merchantCheckoutSessions).set(updateData).where(eq(merchantCheckoutSessions.id, id));
  }

  async updateCheckoutSessionPool(id: string, poolId: string): Promise<void> {
    await db.update(merchantCheckoutSessions).set({ poolId }).where(eq(merchantCheckoutSessions.id, id));
  }

  async getExpiredCheckoutSessions(): Promise<MerchantCheckoutSession[]> {
    return db.select().from(merchantCheckoutSessions)
      .where(and(
        eq(merchantCheckoutSessions.status, 'collecting'),
        sql`${merchantCheckoutSessions.collectionDeadline} < NOW()`
      ));
  }

  async getMerchantCheckoutSessionByPoolId(poolId: string): Promise<MerchantCheckoutSession | undefined> {
    const [session] = await db.select().from(merchantCheckoutSessions)
      .where(eq(merchantCheckoutSessions.poolId, poolId));
    return session;
  }

  async updateMerchantStats(merchantId: string, netAmount: number, feeAmount: number, totalAmount: number): Promise<void> {
    await db.update(merchants).set({
      pendingBalance: sql`${merchants.pendingBalance}::decimal + ${netAmount}::decimal`,
      totalVolume: sql`${merchants.totalVolume}::decimal + ${totalAmount}::decimal`,
      totalFees: sql`${merchants.totalFees}::decimal + ${feeAmount}::decimal`,
    }).where(eq(merchants.id, merchantId));
  }

  // Merchant webhook operations
  async createWebhookDelivery(delivery: InsertMerchantWebhookDelivery): Promise<MerchantWebhookDelivery> {
    const [result] = await db.insert(merchantWebhookDeliveries).values(delivery).returning();
    return result;
  }

  async updateWebhookDelivery(id: string, responseStatus: number, responseBody: string, delivered: boolean): Promise<void> {
    await db.update(merchantWebhookDeliveries).set({
      responseStatus,
      responseBody,
      delivered,
      attempts: sql`${merchantWebhookDeliveries.attempts} + 1`,
    }).where(eq(merchantWebhookDeliveries.id, id));
  }

  // Merchant payout operations
  async createMerchantPayout(payout: InsertMerchantPayout): Promise<MerchantPayout> {
    const [result] = await db.insert(merchantPayouts).values(payout).returning();
    return result;
  }

  async getMerchantPayouts(merchantId: string): Promise<MerchantPayout[]> {
    return db.select().from(merchantPayouts)
      .where(eq(merchantPayouts.merchantId, merchantId))
      .orderBy(desc(merchantPayouts.createdAt));
  }

  // Bank account operations
  async getBankAccountsByUser(userId: string): Promise<BankAccount[]> {
    return db.select().from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .orderBy(desc(bankAccounts.isDefault), desc(bankAccounts.createdAt));
  }

  async getBankAccountById(id: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [result] = await db.insert(bankAccounts).values(account).returning();
    return result;
  }

  async setDefaultBankAccount(userId: string, accountId: string): Promise<void> {
    await db.update(bankAccounts)
      .set({ isDefault: false })
      .where(eq(bankAccounts.userId, userId));
    await db.update(bankAccounts)
      .set({ isDefault: true })
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.userId, userId)));
  }

  async deleteBankAccount(userId: string, accountId: string): Promise<void> {
    await db.delete(bankAccounts)
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.userId, userId)));
  }

  async getBankAccountByStripeAccountId(stripeAccountId: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts)
      .where(eq(bankAccounts.stripeFinancialConnectionsAccountId, stripeAccountId));
    return account;
  }

  async updateBankAccountByStripeAccountId(stripeAccountId: string, updates: Partial<BankAccount>): Promise<BankAccount | undefined> {
    const [result] = await db.update(bankAccounts)
      .set(updates)
      .where(eq(bankAccounts.stripeFinancialConnectionsAccountId, stripeAccountId))
      .returning();
    return result;
  }

  async updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount | undefined> {
    const [result] = await db.update(bankAccounts)
      .set(updates)
      .where(eq(bankAccounts.id, id))
      .returning();
    return result;
  }

  // Pool transfer request operations
  async createPoolTransferRequest(request: InsertPoolTransferRequest): Promise<PoolTransferRequest> {
    const [result] = await db.insert(poolTransferRequests).values(request).returning();
    return result;
  }

  async getPoolTransferRequest(id: string): Promise<PoolTransferRequest | undefined> {
    const [result] = await db.select().from(poolTransferRequests).where(eq(poolTransferRequests.id, id));
    return result;
  }

  async getPoolTransferRequestsByPool(poolId: string): Promise<PoolTransferRequest[]> {
    return db.select().from(poolTransferRequests)
      .where(eq(poolTransferRequests.poolId, poolId))
      .orderBy(desc(poolTransferRequests.createdAt));
  }

  async getPoolTransferRequestsByUser(userId: string): Promise<PoolTransferRequest[]> {
    return db.select().from(poolTransferRequests)
      .where(eq(poolTransferRequests.toUserId, userId))
      .orderBy(desc(poolTransferRequests.createdAt));
  }

  async getPendingTransferRequestsForUser(userId: string): Promise<PoolTransferRequest[]> {
    return db.select().from(poolTransferRequests)
      .where(and(
        eq(poolTransferRequests.toUserId, userId),
        eq(poolTransferRequests.status, 'pending')
      ))
      .orderBy(desc(poolTransferRequests.createdAt));
  }

  async updatePoolTransferRequest(id: string, data: Partial<PoolTransferRequest>): Promise<PoolTransferRequest | undefined> {
    const [result] = await db.update(poolTransferRequests)
      .set(data)
      .where(eq(poolTransferRequests.id, id))
      .returning();
    return result;
  }

  // Badge operations
  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges);
  }

  async getBadgeById(id: string): Promise<Badge | undefined> {
    const [badge] = await db.select().from(badges).where(eq(badges.id, id));
    return badge;
  }

  async getBadgeByCriteria(criteria: string): Promise<Badge | undefined> {
    const [badge] = await db.select().from(badges).where(eq(badges.criteria, criteria));
    return badge;
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [result] = await db.insert(badges).values(badge).returning();
    return result;
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge | undefined> {
    const exists = await this.hasBadge(userId, badgeId);
    if (exists) return undefined;
    
    const [result] = await db.insert(userBadges).values({ userId, badgeId }).returning();
    
    const badge = await this.getBadgeById(badgeId);
    if (badge?.pointsAwarded) {
      await this.addPoints(userId, badge.pointsAwarded, `Earned badge: ${badge.name}`, 'badge', badgeId);
    }
    
    return result;
  }

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const [existing] = await db.select().from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));
    return !!existing;
  }

  async getUserBadges(userId: string): Promise<any[]> {
    const userBadgesData = await db.select().from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
    
    const badgeDetails = await Promise.all(
      userBadgesData.map(async (ub) => {
        const badge = await this.getBadgeById(ub.badgeId);
        return {
          ...ub,
          badge,
        };
      })
    );
    
    return badgeDetails;
  }

  // Points operations
  async getUserPoints(userId: string): Promise<UserPoints | undefined> {
    const [points] = await db.select().from(userPoints).where(eq(userPoints.userId, userId));
    return points;
  }

  async createUserPoints(data: InsertUserPoints): Promise<UserPoints> {
    const [result] = await db.insert(userPoints).values(data).returning();
    return result;
  }

  async addPoints(userId: string, points: number, reason: string, referenceType?: string, referenceId?: string): Promise<UserPoints> {
    let userPointsRecord = await this.getUserPoints(userId);
    
    if (!userPointsRecord) {
      userPointsRecord = await this.createUserPoints({ userId, points: 0, lifetimePoints: 0, currentStreak: 0, longestStreak: 0, level: 1 });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let newStreak = userPointsRecord.currentStreak;
    if (userPointsRecord.lastActivityDate) {
      const lastActivity = new Date(userPointsRecord.lastActivityDate);
      lastActivity.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        newStreak = userPointsRecord.currentStreak + 1;
      } else if (daysDiff > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    const newPoints = userPointsRecord.points + points;
    const newLifetimePoints = userPointsRecord.lifetimePoints + points;
    const newLevel = Math.floor(Math.sqrt(newLifetimePoints / 100)) + 1;
    const newLongestStreak = Math.max(newStreak, userPointsRecord.longestStreak);
    
    const [updated] = await db.update(userPoints)
      .set({
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: new Date(),
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(userPoints.userId, userId))
      .returning();
    
    await db.insert(pointTransactions).values({
      userId,
      points,
      reason,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
    });
    
    return updated;
  }

  async getPointTransactions(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    return db.select().from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(limit);
  }

  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const leaderboardData = await db.select({
      userId: userPoints.userId,
      points: userPoints.points,
      lifetimePoints: userPoints.lifetimePoints,
      level: userPoints.level,
      currentStreak: userPoints.currentStreak,
    })
      .from(userPoints)
      .orderBy(desc(userPoints.lifetimePoints))
      .limit(limit);
    
    const usersData = await Promise.all(
      leaderboardData.map(async (entry) => {
        const user = await this.getUser(entry.userId);
        return {
          ...entry,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            avatar: user.avatar,
          } : null,
        };
      })
    );
    
    return usersData;
  }

  async createPoolActivity(activity: InsertPoolActivity): Promise<PoolActivity> {
    const [result] = await db.insert(poolActivities).values(activity).returning();
    return result;
  }

  async getPoolActivities(poolId: string): Promise<PoolActivity[]> {
    return await db.select().from(poolActivities)
      .where(eq(poolActivities.poolId, poolId))
      .orderBy(desc(poolActivities.createdAt));
  }

  async updatePoolSpentAmount(poolId: string, amount: string): Promise<void> {
    await db.update(pools).set({ spentAmount: amount }).where(eq(pools.id, poolId));
  }

  async followUserNew(followerId: string, followingId: string): Promise<UserFollow> {
    try {
      const [result] = await db.insert(userFollows).values({ followerId, followingId }).returning();
      return result;
    } catch (error: any) {
      if (error.code === '23505') {
        const [existing] = await db.select().from(userFollows).where(
          and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId))
        );
        return existing;
      }
      throw error;
    }
  }

  async unfollowUserNew(followerId: string, followingId: string): Promise<void> {
    await db.delete(userFollows).where(
      and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId))
    );
  }

  async getFollowersDetailed(userId: string, limit: number = 20, offset: number = 0): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; createdAt: Date}[]> {
    const result = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio,
      createdAt: users.createdAt,
    })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .limit(limit)
      .offset(offset);
    return result;
  }

  async getFollowingDetailed(userId: string, limit: number = 20, offset: number = 0): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; createdAt: Date}[]> {
    const result = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio,
      createdAt: users.createdAt,
    })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .limit(limit)
      .offset(offset);
    return result;
  }

  async getFollowersCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followingId, userId));
    return result?.count ?? 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followerId, userId));
    return result?.count ?? 0;
  }

  async isFollowingNew(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db.select().from(userFollows).where(
      and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId))
    );
    return !!result;
  }

  async searchUsers(query: string, limit: number = 20): Promise<{id: string; firstName: string; lastName: string; username: string; avatar: string | null; bio: string | null; isPublic: boolean; createdAt: Date}[]> {
    const searchPattern = `%${query}%`;
    const result = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio,
      isPublic: users.isPublic,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(
        or(
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(users.username, searchPattern)
        )
      )
      .limit(limit);
    return result;
  }
}

export const storage = new DatabaseStorage();
