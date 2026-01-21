import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, boolean, varchar, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const poolCategoryEnum = pgEnum('pool_category', ['Trip', 'Gift', 'Purchase', 'Event', 'Other', 'Recurring']);
export const poolStatusEnum = pgEnum('pool_status', ['active', 'completed', 'expired']);
export const frequencyEnum = pgEnum('frequency', ['weekly', 'monthly', 'quarterly']);
export const notificationTypeEnum = pgEnum('notification_type', ['contribution', 'comment', 'goal_reached', 'friend_request', 'pool_invite']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined']);
export const inviteMethodEnum = pgEnum('invite_method', ['email', 'sms', 'push', 'link']);
export const kycStatusEnum = pgEnum('kyc_status', ['not_started', 'pending', 'verified', 'failed']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  phone: text("phone"),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifySMS: boolean("notify_sms").notNull().default(true),
  notifyPush: boolean("notify_push").notNull().default(true),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  poolsCreated: integer("pools_created").notNull().default(0),
  totalContributed: decimal("total_contributed", { precision: 10, scale: 2 }).notNull().default('0'),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('5.0'),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  transactionPin: text("transaction_pin"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  kycStatus: kycStatusEnum("kyc_status").notNull().default('not_started'),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeCardholderId: text("stripe_cardholder_id"),
  plaidAccessToken: text("plaid_access_token"),
  plaidAccountId: text("plaid_account_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  description: text("description"),
});

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  badgeId: varchar("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const pools = pgTable("pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  category: poolCategoryEnum("category").notNull(),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  deadline: timestamp("deadline").notNull(),
  status: poolStatusEnum("status").notNull().default('active'),
  image: text("image"),
  isRecurring: boolean("is_recurring").default(false),
  frequency: frequencyEnum("frequency"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contributions = pgTable("contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripeSessionId: varchar("stripe_session_id").unique(),
  guestEmail: text("guest_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const virtualCards = pgTable("virtual_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  cardNumber: text("card_number").notNull(),
  expiry: text("expiry").notNull(),
  cvc: text("cvc").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  stripeCardId: text("stripe_card_id"),
  lastFour: text("last_four"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  virtualCardId: varchar("virtual_card_id").references(() => virtualCards.id).notNull(),
  merchant: text("merchant").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('completed'),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recurringContributions = pgTable("recurring_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: frequencyEnum("frequency").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default('active'),
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  followingId: varchar("following_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  inviterId: varchar("inviter_id").references(() => users.id).notNull(),
  inviteeId: varchar("invitee_id").references(() => users.id),
  inviteeEmail: text("invitee_email"),
  inviteePhone: text("invitee_phone"),
  status: inviteStatusEnum("status").notNull().default('pending'),
  method: inviteMethodEnum("method").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const walletDeposits = pgTable("wallet_deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeSessionId: varchar("stripe_session_id").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  plaidAccountId: text("plaid_account_id").notNull(),
  institutionName: text("institution_name").notNull(),
  accountName: text("account_name").notNull(),
  accountMask: text("account_mask").notNull(),
  accountType: text("account_type").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiAccessRequests = pgTable("api_access_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  website: text("website").notNull(),
  useCase: text("use_case").notNull(),
  monthlyVolume: text("monthly_volume").notNull(),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  poolsCreated: true, 
  totalContributed: true, 
  balance: true, 
  rating: true,
  emailVerified: true,
  phoneVerified: true,
  transactionPin: true,
  twoFactorSecret: true,
  twoFactorEnabled: true,
  kycStatus: true,
  kycVerifiedAt: true,
  stripeCustomerId: true,
  stripeCardholderId: true,
  plaidAccessToken: true,
  plaidAccountId: true,
});
export const insertPoolSchema = createInsertSchema(pools).omit({ id: true, createdAt: true, updatedAt: true, currentAmount: true, status: true });
export const insertContributionSchema = createInsertSchema(contributions).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, likes: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });
export const insertVirtualCardSchema = createInsertSchema(virtualCards).omit({ id: true, createdAt: true, isActive: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true, status: true });
export const insertInviteSchema = createInsertSchema(invites).omit({ id: true, createdAt: true, status: true });
export const insertRecurringContributionSchema = createInsertSchema(recurringContributions).omit({ id: true, createdAt: true, status: true });
export const insertApiAccessRequestSchema = createInsertSchema(apiAccessRequests).omit({ id: true, createdAt: true, status: true });

// Login/Register Schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

// Select Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pool = typeof pools.$inferSelect;
export type InsertPool = z.infer<typeof insertPoolSchema>;
export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type VirtualCard = typeof virtualCards.$inferSelect;
export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type RecurringContribution = typeof recurringContributions.$inferSelect;
export type InsertRecurringContribution = z.infer<typeof insertRecurringContributionSchema>;
export type ApiAccessRequest = typeof apiAccessRequests.$inferSelect;
export type InsertApiAccessRequest = z.infer<typeof insertApiAccessRequestSchema>;
