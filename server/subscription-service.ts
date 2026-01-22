import Stripe from "stripe";
import { db } from "./db";
import { subscriptionPlans, userSubscriptions, subscriptionHistory, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("Stripe API key not configured - subscription features limited");
    return null;
  }
  stripeInstance = new Stripe(key);
  return stripeInstance;
}

function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe API key not configured. Please add STRIPE_SECRET_KEY to enable subscription features.");
  }
  return stripe;
}

interface PlanLimits {
  maxPools: number;
  maxPoolAmount: number;
  maxMonthlyContributions: number;
  virtualCardLimit: number;
  prioritySupport: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
}

const DEFAULT_PLANS: Record<string, { name: string; description: string; monthlyPrice: number; yearlyPrice: number } & PlanLimits> = {
  free: {
    name: "Free",
    description: "Get started with basic pool features",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxPools: 3,
    maxPoolAmount: 500,
    maxMonthlyContributions: 10,
    virtualCardLimit: 1,
    prioritySupport: false,
    customBranding: false,
    advancedAnalytics: false,
    apiAccess: false,
  },
  plus: {
    name: "Plus",
    description: "More pools, higher limits, and premium features",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    maxPools: 10,
    maxPoolAmount: 5000,
    maxMonthlyContributions: 50,
    virtualCardLimit: 5,
    prioritySupport: true,
    customBranding: false,
    advancedAnalytics: true,
    apiAccess: false,
  },
  pro: {
    name: "Pro",
    description: "Unlimited features for power users and businesses",
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    maxPools: 100,
    maxPoolAmount: 50000,
    maxMonthlyContributions: 500,
    virtualCardLimit: 20,
    prioritySupport: true,
    customBranding: true,
    advancedAnalytics: true,
    apiAccess: true,
  },
};

export class SubscriptionService {
  async initializePlans(): Promise<void> {
    for (const [tier, plan] of Object.entries(DEFAULT_PLANS)) {
      const [existing] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.tier, tier as any));
      
      if (!existing) {
        await db.insert(subscriptionPlans).values({
          tier: tier as any,
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice.toString(),
          yearlyPrice: plan.yearlyPrice.toString(),
          maxPools: plan.maxPools,
          maxPoolAmount: plan.maxPoolAmount.toString(),
          maxMonthlyContributions: plan.maxMonthlyContributions,
          virtualCardLimit: plan.virtualCardLimit,
          prioritySupport: plan.prioritySupport,
          customBranding: plan.customBranding,
          advancedAnalytics: plan.advancedAnalytics,
          apiAccess: plan.apiAccess,
          features: JSON.stringify(plan),
        });
      }
    }
  }

  async getPlans(): Promise<any[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async getPlanByTier(tier: 'free' | 'plus' | 'pro'): Promise<any> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.tier, tier));
    return plan;
  }

  async getUserSubscription(userId: string): Promise<any> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    
    if (!subscription) {
      const freePlan = await this.getPlanByTier('free');
      if (freePlan) {
        await db.insert(userSubscriptions).values({
          userId,
          planId: freePlan.id,
          tier: 'free',
        });
        return await this.getUserSubscription(userId);
      }
    }
    
    return subscription;
  }

  async getUserLimits(userId: string): Promise<PlanLimits & { subscription: any }> {
    const subscription = await this.getUserSubscription(userId);
    const plan = subscription ? await this.getPlanByTier(subscription.tier) : await this.getPlanByTier('free');
    
    return {
      maxPools: plan?.maxPools || 3,
      maxPoolAmount: parseFloat(plan?.maxPoolAmount || '500'),
      maxMonthlyContributions: plan?.maxMonthlyContributions || 10,
      virtualCardLimit: plan?.virtualCardLimit || 1,
      prioritySupport: plan?.prioritySupport || false,
      customBranding: plan?.customBranding || false,
      advancedAnalytics: plan?.advancedAnalytics || false,
      apiAccess: plan?.apiAccess || false,
      subscription,
    };
  }

  async checkLimit(userId: string, limitType: 'pools' | 'contributions' | 'virtualCards'): Promise<{ allowed: boolean; current: number; limit: number; tier: string }> {
    const subscription = await this.getUserSubscription(userId);
    const limits = await this.getUserLimits(userId);
    
    let current = 0;
    let limit = 0;
    
    switch (limitType) {
      case 'pools':
        current = subscription?.poolsUsed || 0;
        limit = limits.maxPools;
        break;
      case 'contributions':
        current = subscription?.monthlyContributionsUsed || 0;
        limit = limits.maxMonthlyContributions;
        break;
      case 'virtualCards':
        current = subscription?.virtualCardsUsed || 0;
        limit = limits.virtualCardLimit;
        break;
    }
    
    return {
      allowed: current < limit,
      current,
      limit,
      tier: subscription?.tier || 'free',
    };
  }

  async incrementUsage(userId: string, usageType: 'pools' | 'contributions' | 'virtualCards'): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return;
    
    const updateField = usageType === 'pools' ? 'poolsUsed' : 
                        usageType === 'contributions' ? 'monthlyContributionsUsed' : 'virtualCardsUsed';
    
    await db.update(userSubscriptions)
      .set({ 
        [updateField]: sql`${userSubscriptions[updateField as keyof typeof userSubscriptions]} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.userId, userId));
  }

  async createCheckoutSession(userId: string, tier: 'plus' | 'pro', billingCycle: 'monthly' | 'yearly'): Promise<string> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const plan = await this.getPlanByTier(tier);
    if (!plan) throw new Error("Plan not found");

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await requireStripe().customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
    }

    const priceId = billingCycle === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
    
    if (!priceId) {
      const amount = billingCycle === 'monthly' ? 
        Math.round(parseFloat(plan.monthlyPrice) * 100) : 
        Math.round(parseFloat(plan.yearlyPrice) * 100);

      const price = await requireStripe().prices.create({
        unit_amount: amount,
        currency: 'usd',
        recurring: { interval: billingCycle === 'monthly' ? 'month' : 'year' },
        product_data: {
          name: `ChipInPool ${plan.name}`,
        },
      });

      const priceField = billingCycle === 'monthly' ? 'stripePriceIdMonthly' : 'stripePriceIdYearly';
      await db.update(subscriptionPlans)
        .set({ [priceField]: price.id })
        .where(eq(subscriptionPlans.id, plan.id));

      const session = await requireStripe().checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{ price: price.id, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL || 'https://localhost:5000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'https://localhost:5000'}/subscription/cancel`,
        metadata: { userId, tier, billingCycle },
      });

      return session.url || '';
    }

    const session = await requireStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'https://localhost:5000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://localhost:5000'}/subscription/cancel`,
      metadata: { userId, tier, billingCycle },
    });

    return session.url || '';
  }

  async handleSubscriptionCreated(subscriptionId: string, customerId: string): Promise<void> {
    const subscriptionData = await requireStripe().subscriptions.retrieve(subscriptionId);
    const customer = await requireStripe().customers.retrieve(customerId);
    
    if (customer.deleted) return;
    
    const userId = (customer as Stripe.Customer).metadata?.userId;
    if (!userId) return;

    const tier = (subscriptionData.metadata?.tier as 'plus' | 'pro') || 'plus';
    const plan = await this.getPlanByTier(tier);
    
    const existingSub = await this.getUserSubscription(userId);
    const fromTier = existingSub?.tier || 'free';
    
    const periodStart = (subscriptionData as any).current_period_start;
    const periodEnd = (subscriptionData as any).current_period_end;

    if (existingSub) {
      await db.update(userSubscriptions)
        .set({
          planId: plan.id,
          tier,
          status: 'active',
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          billingCycle: subscriptionData.items.data[0]?.price?.recurring?.interval || 'monthly',
          currentPeriodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.userId, userId));
    } else {
      await db.insert(userSubscriptions).values({
        userId,
        planId: plan.id,
        tier,
        status: 'active',
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        billingCycle: subscriptionData.items.data[0]?.price?.recurring?.interval || 'monthly',
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
      });
    }

    await db.insert(subscriptionHistory).values({
      userId,
      fromTier: fromTier as any,
      toTier: tier,
      action: 'upgrade',
      amount: (subscriptionData.items.data[0]?.price?.unit_amount || 0) / 100 + '',
      stripeInvoiceId: subscriptionData.latest_invoice as string,
    });
  }

  async handleSubscriptionCancelled(subscriptionId: string): Promise<void> {
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
    if (!sub) return;

    await db.update(userSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

    await db.insert(subscriptionHistory).values({
      userId: sub.userId,
      fromTier: sub.tier,
      toTier: 'free',
      action: 'cancel',
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription?.stripeSubscriptionId) throw new Error("No active subscription");

    await requireStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.update(userSubscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(userSubscriptions.userId, userId));
  }

  async resetMonthlyUsage(): Promise<void> {
    await db.update(userSubscriptions)
      .set({ monthlyContributionsUsed: 0, updatedAt: new Date() });
  }
}

export const subscriptionService = new SubscriptionService();
