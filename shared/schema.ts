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

export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'apple']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  phone: text("phone").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  authProvider: authProviderEnum("auth_provider").notNull().default('email'),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifySMS: boolean("notify_sms").notNull().default(true),
  notifyPush: boolean("notify_push").notNull().default(true),
  notifySecurityAlerts: boolean("notify_security_alerts").notNull().default(true),
  notifyKycUpdates: boolean("notify_kyc_updates").notNull().default(true),
  notifyCardActivity: boolean("notify_card_activity").notNull().default(true),
  notifyAccountChanges: boolean("notify_account_changes").notNull().default(true),
  notifyWalletActivity: boolean("notify_wallet_activity").notNull().default(true),
  emailSecurityAlerts: boolean("email_security_alerts").notNull().default(true),
  emailKycUpdates: boolean("email_kyc_updates").notNull().default(true),
  emailCardActivity: boolean("email_card_activity").notNull().default(true),
  emailWalletActivity: boolean("email_wallet_activity").notNull().default(true),
  emailAccountChanges: boolean("email_account_changes").notNull().default(true),
  smsSecurityAlerts: boolean("sms_security_alerts").notNull().default(true),
  smsKycUpdates: boolean("sms_kyc_updates").notNull().default(true),
  smsCardActivity: boolean("sms_card_activity").notNull().default(false),
  smsWalletActivity: boolean("sms_wallet_activity").notNull().default(false),
  smsAccountChanges: boolean("sms_account_changes").notNull().default(false),
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
  stripeConnectId: text("stripe_connect_id"),
  stripeIdentityVerificationId: text("stripe_identity_verification_id"),
  verifiedLegalName: text("verified_legal_name"),
  verifiedAddress: text("verified_address"),
  verifiedCity: text("verified_city"),
  verifiedState: text("verified_state"),
  verifiedPostalCode: text("verified_postal_code"),
  verifiedCountry: text("verified_country"),
  verifiedDob: text("verified_dob"),
  plaidAccessToken: text("plaid_access_token"),
  plaidAccountId: text("plaid_account_id"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  role: userRoleEnum("role").notNull().default('user'),
  suspended: boolean("suspended").notNull().default(false),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const phoneVerificationCodes = pgTable("phone_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const badgeCategoryEnum = pgEnum('badge_category', ['contribution', 'pool', 'social', 'streak', 'milestone', 'special']);

export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  description: text("description"),
  category: badgeCategoryEnum("category").notNull().default('special'),
  criteria: text("criteria"),
  threshold: integer("threshold"),
  pointsAwarded: integer("points_awarded").notNull().default(10),
  rarity: text("rarity").notNull().default('common'),
});

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  badgeId: varchar("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  referenceType: text("reference_type"),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const payoutSpeedEnum = pgEnum('payout_speed', ['standard', 'instant']);

export const walletWithdrawals = pgTable("wallet_withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bankAccountId: varchar("bank_account_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  payoutSpeed: payoutSpeedEnum("payout_speed").notNull().default('standard'),
  instantFee: decimal("instant_fee", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  plaidTransferId: varchar("plaid_transfer_id"),
  accountHolderName: text("account_holder_name"),
  routingNumber: text("routing_number"),
  accountNumberLast4: text("account_number_last4"),
  accountType: text("account_type"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by"),
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

export const payoutMethodEnum = pgEnum('payout_method', ['bank_account', 'debit_card']);

export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // Stripe Financial Connections fields
  stripeFinancialConnectionsAccountId: text("stripe_financial_connections_account_id"),
  stripeExternalAccountId: text("stripe_external_account_id"),
  // Legacy Plaid fields (deprecated)
  plaidAccountId: text("plaid_account_id"),
  plaidAccessToken: text("plaid_access_token"),
  institutionName: text("institution_name").notNull(),
  accountName: text("account_name").notNull(),
  accountMask: text("account_mask").notNull(),
  accountType: text("account_type").notNull(),
  payoutMethod: payoutMethodEnum("payout_method").notNull().default('bank_account'),
  isDefault: boolean("is_default").notNull().default(false),
  // Bank details for direct payouts
  routingNumber: text("routing_number"),
  accountNumber: text("account_number"),
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
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true });
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

// Phone verification schemas
export const insertPhoneVerificationSchema = createInsertSchema(phoneVerificationCodes).omit({ id: true, createdAt: true, verified: true });
export type PhoneVerificationCode = typeof phoneVerificationCodes.$inferSelect;

// Login/Register Schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginWithUsernameSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const phoneLoginSchema = z.object({
  phone: z.string().min(10),
});

export const verifyPhoneLoginSchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  method: z.enum(["email", "phone"]),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }, "You must be at least 18 years old"),
  phoneVerificationCode: z.string().length(6, "Verification code must be 6 digits"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy" }) }),
});

export const sendPhoneCodeSchema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
});

export const verifyPhoneCodeSchema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

// Admin audit logs
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });

// ============================================
// ChipInPay Merchant Integration Schema
// ============================================

export const merchantStatusEnum = pgEnum('merchant_status', ['pending', 'approved', 'suspended', 'rejected']);
export const checkoutSessionStatusEnum = pgEnum('checkout_session_status', ['pending', 'collecting', 'completed', 'expired', 'cancelled', 'refunded']);
export const webhookEventEnum = pgEnum('webhook_event', ['session.created', 'session.collecting', 'session.completed', 'session.expired', 'session.cancelled', 'contribution.received']);

export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  website: text("website").notNull(),
  businessType: text("business_type").notNull(),
  description: text("description"),
  logo: text("logo"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  status: merchantStatusEnum("status").notNull().default('pending'),
  feePercent: decimal("fee_percent", { precision: 5, scale: 2 }).notNull().default('5.00'),
  totalVolume: decimal("total_volume", { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalFees: decimal("total_fees", { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalPayouts: decimal("total_payouts", { precision: 12, scale: 2 }).notNull().default('0.00'),
  pendingBalance: decimal("pending_balance", { precision: 12, scale: 2 }).notNull().default('0.00'),
  stripeConnectId: text("stripe_connect_id"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const merchantApiKeys = pgTable("merchant_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id).notNull(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const merchantCheckoutSessions = pgTable("merchant_checkout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id).notNull(),
  poolId: varchar("pool_id").references(() => pools.id),
  externalOrderId: text("external_order_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  collectedAmount: decimal("collected_amount", { precision: 10, scale: 2 }).notNull().default('0.00'),
  productTitle: text("product_title").notNull(),
  productDescription: text("product_description"),
  productImage: text("product_image"),
  status: checkoutSessionStatusEnum("status").notNull().default('pending'),
  collectionDeadline: timestamp("collection_deadline").notNull(),
  successUrl: text("success_url"),
  cancelUrl: text("cancel_url"),
  successWebhook: text("success_webhook"),
  customerId: varchar("customer_id").references(() => users.id),
  customerEmail: text("customer_email"),
  metadata: text("metadata"),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const merchantWebhookDeliveries = pgTable("merchant_webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id).notNull(),
  sessionId: varchar("session_id").references(() => merchantCheckoutSessions.id),
  event: webhookEventEnum("event").notNull(),
  payload: text("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attempts: integer("attempts").notNull().default(1),
  delivered: boolean("delivered").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const merchantPayouts = pgTable("merchant_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'),
  stripeTransferId: text("stripe_transfer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Merchant Insert Schemas
export const insertMerchantSchema = createInsertSchema(merchants).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  feePercent: true,
  totalVolume: true,
  totalFees: true,
  totalPayouts: true,
  pendingBalance: true,
  webhookSecret: true,
});

export const insertMerchantApiKeySchema = createInsertSchema(merchantApiKeys).omit({ 
  id: true, 
  createdAt: true, 
  lastUsedAt: true,
  isActive: true,
});

export const insertMerchantCheckoutSessionSchema = createInsertSchema(merchantCheckoutSessions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  collectedAmount: true,
  completedAt: true,
});

export const insertMerchantWebhookDeliverySchema = createInsertSchema(merchantWebhookDeliveries).omit({ 
  id: true, 
  createdAt: true, 
  responseStatus: true,
  responseBody: true,
  attempts: true,
  delivered: true,
});

export const insertMerchantPayoutSchema = createInsertSchema(merchantPayouts).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  stripeTransferId: true,
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
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

// Merchant Types
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type MerchantApiKey = typeof merchantApiKeys.$inferSelect;
export type InsertMerchantApiKey = z.infer<typeof insertMerchantApiKeySchema>;
export type MerchantCheckoutSession = typeof merchantCheckoutSessions.$inferSelect;
export type InsertMerchantCheckoutSession = z.infer<typeof insertMerchantCheckoutSessionSchema>;
export type MerchantWebhookDelivery = typeof merchantWebhookDeliveries.$inferSelect;
export type InsertMerchantWebhookDelivery = z.infer<typeof insertMerchantWebhookDeliverySchema>;
export type MerchantPayout = typeof merchantPayouts.$inferSelect;
export type InsertMerchantPayout = z.infer<typeof insertMerchantPayoutSchema>;

// ============================================
// Fraud Detection System Schema
// ============================================

export const fraudRiskLevelEnum = pgEnum('fraud_risk_level', ['low', 'medium', 'high', 'critical']);
export const fraudAlertStatusEnum = pgEnum('fraud_alert_status', ['pending', 'reviewed', 'dismissed', 'confirmed']);

export const fraudAlerts = pgTable("fraud_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  contributionId: varchar("contribution_id").references(() => contributions.id),
  riskLevel: fraudRiskLevelEnum("risk_level").notNull(),
  riskScore: integer("risk_score").notNull(),
  alertType: text("alert_type").notNull(),
  description: text("description").notNull(),
  indicators: text("indicators").notNull(),
  status: fraudAlertStatusEnum("status").notNull().default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  ipAddress: text("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRiskProfiles = pgTable("user_risk_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  riskScore: integer("risk_score").notNull().default(0),
  riskLevel: fraudRiskLevelEnum("risk_level").notNull().default('low'),
  totalAlerts: integer("total_alerts").notNull().default(0),
  confirmedFrauds: integer("confirmed_frauds").notNull().default(0),
  avgTransactionAmount: decimal("avg_transaction_amount", { precision: 10, scale: 2 }).default('0.00'),
  maxTransactionAmount: decimal("max_transaction_amount", { precision: 10, scale: 2 }).default('0.00'),
  transactionVelocity24h: integer("transaction_velocity_24h").default(0),
  transactionVelocity7d: integer("transaction_velocity_7d").default(0),
  unusualActivityFlags: text("unusual_activity_flags"),
  lastActivityAt: timestamp("last_activity_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const velocityLogs = pgTable("velocity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  ipAddress: text("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({ id: true, createdAt: true, status: true, reviewedBy: true, reviewedAt: true, reviewNotes: true });
export const insertUserRiskProfileSchema = createInsertSchema(userRiskProfiles).omit({ id: true, updatedAt: true });
export const insertVelocityLogSchema = createInsertSchema(velocityLogs).omit({ id: true, createdAt: true });

export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type UserRiskProfile = typeof userRiskProfiles.$inferSelect;
export type InsertUserRiskProfile = z.infer<typeof insertUserRiskProfileSchema>;
export type VelocityLog = typeof velocityLogs.$inferSelect;
export type InsertVelocityLog = z.infer<typeof insertVelocityLogSchema>;

// ============================================
// MFA Recovery Codes Schema
// ============================================

export const mfaRecoveryCodes = pgTable("mfa_recovery_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  codeHash: text("code_hash").notNull(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mfaLoginAttempts = pgTable("mfa_login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  success: boolean("success").notNull(),
  method: text("method").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMfaRecoveryCodeSchema = createInsertSchema(mfaRecoveryCodes).omit({ id: true, createdAt: true, used: true, usedAt: true });
export const insertMfaLoginAttemptSchema = createInsertSchema(mfaLoginAttempts).omit({ id: true, createdAt: true });

export type MfaRecoveryCode = typeof mfaRecoveryCodes.$inferSelect;
export type InsertMfaRecoveryCode = z.infer<typeof insertMfaRecoveryCodeSchema>;
export type MfaLoginAttempt = typeof mfaLoginAttempts.$inferSelect;
export type InsertMfaLoginAttempt = z.infer<typeof insertMfaLoginAttemptSchema>;

// ============================================
// Subscription System Schema
// ============================================

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'plus', 'pro']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'cancelled', 'expired']);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: subscriptionTierEnum("tier").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).notNull(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  maxPools: integer("max_pools").notNull(),
  maxPoolAmount: decimal("max_pool_amount", { precision: 10, scale: 2 }).notNull(),
  maxMonthlyContributions: integer("max_monthly_contributions").notNull(),
  virtualCardLimit: integer("virtual_card_limit").notNull(),
  prioritySupport: boolean("priority_support").notNull().default(false),
  customBranding: boolean("custom_branding").notNull().default(false),
  advancedAnalytics: boolean("advanced_analytics").notNull().default(false),
  apiAccess: boolean("api_access").notNull().default(false),
  features: text("features"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  tier: subscriptionTierEnum("tier").notNull().default('free'),
  status: subscriptionStatusEnum("status").notNull().default('active'),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  billingCycle: text("billing_cycle").default('monthly'),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at"),
  poolsUsed: integer("pools_used").notNull().default(0),
  monthlyContributionsUsed: integer("monthly_contributions_used").notNull().default(0),
  virtualCardsUsed: integer("virtual_cards_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionHistory = pgTable("subscription_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fromTier: subscriptionTierEnum("from_tier"),
  toTier: subscriptionTierEnum("to_tier").notNull(),
  action: text("action").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  stripeInvoiceId: text("stripe_invoice_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transferStatusEnum = pgEnum('transfer_status', ['pending', 'accepted', 'completed', 'cancelled', 'failed']);

export const poolTransferRequests = pgTable("pool_transfer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").references(() => pools.id).notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: transferStatusEnum("status").notNull().default('pending'),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  plaidTransferId: text("plaid_transfer_id"),
  notes: text("notes"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPoolTransferRequestSchema = createInsertSchema(poolTransferRequests).omit({ 
  id: true, 
  createdAt: true, 
  status: true, 
  acceptedAt: true, 
  completedAt: true,
  plaidTransferId: true 
});
export type PoolTransferRequest = typeof poolTransferRequests.$inferSelect;
export type InsertPoolTransferRequest = z.infer<typeof insertPoolTransferRequestSchema>;

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, isActive: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true, status: true, poolsUsed: true, monthlyContributionsUsed: true, virtualCardsUsed: true });
export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).omit({ id: true, createdAt: true });

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;

export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export const insertUserPointsSchema = createInsertSchema(userPoints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({ id: true, createdAt: true });

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
