import { db } from "./db";
import { fraudAlerts, userRiskProfiles, velocityLogs, users, transactions, contributions } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

interface RiskAssessment {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  shouldBlock: boolean;
  alertType?: string;
}

interface TransactionContext {
  userId: string;
  amount: number;
  type: 'transaction' | 'contribution' | 'withdrawal' | 'deposit';
  ipAddress?: string;
  deviceFingerprint?: string;
  merchantId?: string;
  poolId?: string;
}

const RISK_THRESHOLDS = {
  VELOCITY_24H_LIMIT: 10,
  VELOCITY_7D_LIMIT: 50,
  SINGLE_TRANSACTION_HIGH: 1000,
  SINGLE_TRANSACTION_CRITICAL: 5000,
  DAILY_VOLUME_HIGH: 5000,
  DAILY_VOLUME_CRITICAL: 10000,
  NEW_ACCOUNT_DAYS: 7,
  SUSPICIOUS_TIME_START: 1,
  SUSPICIOUS_TIME_END: 5,
};

export class FraudDetectionService {
  async assessTransactionRisk(context: TransactionContext): Promise<RiskAssessment> {
    const indicators: string[] = [];
    let riskScore = 0;

    const [user] = await db.select().from(users).where(eq(users.id, context.userId));
    if (!user) {
      return { riskScore: 100, riskLevel: 'critical', indicators: ['User not found'], shouldBlock: true, alertType: 'invalid_user' };
    }

    const [riskProfile] = await db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, context.userId));

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentLogs24h = await db.select()
      .from(velocityLogs)
      .where(and(eq(velocityLogs.userId, context.userId), gte(velocityLogs.createdAt, twentyFourHoursAgo)));

    const recentLogs7d = await db.select()
      .from(velocityLogs)
      .where(and(eq(velocityLogs.userId, context.userId), gte(velocityLogs.createdAt, sevenDaysAgo)));

    if (recentLogs24h.length >= RISK_THRESHOLDS.VELOCITY_24H_LIMIT) {
      riskScore += 30;
      indicators.push(`High velocity: ${recentLogs24h.length} actions in 24h`);
    }

    if (recentLogs7d.length >= RISK_THRESHOLDS.VELOCITY_7D_LIMIT) {
      riskScore += 20;
      indicators.push(`High weekly velocity: ${recentLogs7d.length} actions in 7d`);
    }

    if (context.amount >= RISK_THRESHOLDS.SINGLE_TRANSACTION_CRITICAL) {
      riskScore += 40;
      indicators.push(`Critical amount: $${context.amount}`);
    } else if (context.amount >= RISK_THRESHOLDS.SINGLE_TRANSACTION_HIGH) {
      riskScore += 20;
      indicators.push(`High amount: $${context.amount}`);
    }

    const dailyVolume = recentLogs24h.reduce((sum, log) => sum + parseFloat(log.amount || '0'), 0);
    if (dailyVolume + context.amount >= RISK_THRESHOLDS.DAILY_VOLUME_CRITICAL) {
      riskScore += 35;
      indicators.push(`Critical daily volume: $${(dailyVolume + context.amount).toFixed(2)}`);
    } else if (dailyVolume + context.amount >= RISK_THRESHOLDS.DAILY_VOLUME_HIGH) {
      riskScore += 15;
      indicators.push(`High daily volume: $${(dailyVolume + context.amount).toFixed(2)}`);
    }

    const accountAge = (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAge < RISK_THRESHOLDS.NEW_ACCOUNT_DAYS) {
      riskScore += 15;
      indicators.push(`New account: ${Math.floor(accountAge)} days old`);
    }

    if (!user.kycStatus || user.kycStatus === 'not_started') {
      riskScore += 25;
      indicators.push('KYC not completed');
    } else if (user.kycStatus === 'pending') {
      riskScore += 10;
      indicators.push('KYC pending verification');
    }

    const hour = now.getHours();
    if (hour >= RISK_THRESHOLDS.SUSPICIOUS_TIME_START && hour <= RISK_THRESHOLDS.SUSPICIOUS_TIME_END) {
      riskScore += 10;
      indicators.push(`Unusual time: ${hour}:00`);
    }

    if (riskProfile && riskProfile.confirmedFrauds > 0) {
      riskScore += 50;
      indicators.push(`Previous fraud history: ${riskProfile.confirmedFrauds} confirmed`);
    }

    if (riskProfile) {
      const avgAmount = parseFloat(riskProfile.avgTransactionAmount || '0');
      if (avgAmount > 0 && context.amount > avgAmount * 5) {
        riskScore += 25;
        indicators.push(`Unusual amount: ${(context.amount / avgAmount).toFixed(1)}x average`);
      }
    }

    riskScore = Math.min(100, riskScore);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    const shouldBlock = riskScore >= 80;

    let alertType: string | undefined;
    if (riskScore >= 40) {
      if (indicators.some(i => i.includes('velocity'))) alertType = 'velocity_anomaly';
      else if (indicators.some(i => i.includes('amount'))) alertType = 'amount_anomaly';
      else if (indicators.some(i => i.includes('fraud history'))) alertType = 'repeat_offender';
      else alertType = 'suspicious_pattern';
    }

    return { riskScore, riskLevel, indicators, shouldBlock, alertType };
  }

  async logVelocity(context: TransactionContext): Promise<void> {
    await db.insert(velocityLogs).values({
      userId: context.userId,
      actionType: context.type,
      amount: context.amount.toString(),
      ipAddress: context.ipAddress,
      deviceFingerprint: context.deviceFingerprint,
      metadata: JSON.stringify({ merchantId: context.merchantId, poolId: context.poolId }),
    });
  }

  async createAlert(context: TransactionContext, assessment: RiskAssessment, transactionId?: string, contributionId?: string): Promise<void> {
    if (assessment.riskScore < 40) return;

    await db.insert(fraudAlerts).values({
      userId: context.userId,
      transactionId: transactionId || null,
      contributionId: contributionId || null,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      alertType: assessment.alertType || 'suspicious_activity',
      description: `Risk assessment flagged ${context.type} of $${context.amount}`,
      indicators: JSON.stringify(assessment.indicators),
      ipAddress: context.ipAddress,
      deviceFingerprint: context.deviceFingerprint,
    });

    await this.updateUserRiskProfile(context.userId, assessment);
  }

  async updateUserRiskProfile(userId: string, assessment: RiskAssessment): Promise<void> {
    const [existing] = await db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, userId));

    if (existing) {
      await db.update(userRiskProfiles)
        .set({
          riskScore: Math.max(existing.riskScore, assessment.riskScore),
          riskLevel: assessment.riskScore > existing.riskScore ? assessment.riskLevel : existing.riskLevel,
          totalAlerts: existing.totalAlerts + 1,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userRiskProfiles.userId, userId));
    } else {
      await db.insert(userRiskProfiles).values({
        userId,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        totalAlerts: 1,
        lastActivityAt: new Date(),
      });
    }
  }

  async processTransaction(context: TransactionContext, transactionId?: string, contributionId?: string): Promise<RiskAssessment> {
    await this.logVelocity(context);
    const assessment = await this.assessTransactionRisk(context);
    await this.createAlert(context, assessment, transactionId, contributionId);
    return assessment;
  }

  async getAlerts(status?: string, limitNum: number = 50): Promise<any[]> {
    if (status && status !== 'all') {
      return await db.select().from(fraudAlerts)
        .where(eq(fraudAlerts.status, status as any))
        .orderBy(desc(fraudAlerts.createdAt))
        .limit(limitNum);
    }
    
    return await db.select().from(fraudAlerts)
      .orderBy(desc(fraudAlerts.createdAt))
      .limit(limitNum);
  }

  async reviewAlert(alertId: string, reviewerId: string, status: 'reviewed' | 'dismissed' | 'confirmed', notes?: string): Promise<void> {
    await db.update(fraudAlerts)
      .set({
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      })
      .where(eq(fraudAlerts.id, alertId));

    if (status === 'confirmed') {
      const [alert] = await db.select().from(fraudAlerts).where(eq(fraudAlerts.id, alertId));
      if (alert?.userId) {
        const [profile] = await db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, alert.userId));
        if (profile) {
          await db.update(userRiskProfiles)
            .set({ confirmedFrauds: profile.confirmedFrauds + 1, updatedAt: new Date() })
            .where(eq(userRiskProfiles.userId, alert.userId));
        }
      }
    }
  }

  async getUserRiskProfile(userId: string): Promise<any> {
    const [profile] = await db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, userId));
    return profile;
  }

  async getDashboardStats(): Promise<any> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalAlerts] = await db.select({ count: sql<number>`count(*)` }).from(fraudAlerts);
    const [pendingAlerts] = await db.select({ count: sql<number>`count(*)` }).from(fraudAlerts).where(eq(fraudAlerts.status, 'pending'));
    const [criticalAlerts] = await db.select({ count: sql<number>`count(*)` }).from(fraudAlerts).where(eq(fraudAlerts.riskLevel, 'critical'));
    const [recentAlerts] = await db.select({ count: sql<number>`count(*)` }).from(fraudAlerts).where(gte(fraudAlerts.createdAt, twentyFourHoursAgo));
    const [highRiskUsers] = await db.select({ count: sql<number>`count(*)` }).from(userRiskProfiles).where(eq(userRiskProfiles.riskLevel, 'high'));

    return {
      totalAlerts: totalAlerts?.count || 0,
      pendingAlerts: pendingAlerts?.count || 0,
      criticalAlerts: criticalAlerts?.count || 0,
      alertsLast24h: recentAlerts?.count || 0,
      highRiskUsers: highRiskUsers?.count || 0,
    };
  }
}

export const fraudDetection = new FraudDetectionService();
