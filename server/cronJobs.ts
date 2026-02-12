import cron from 'node-cron';
import { db } from './db';
import { storage } from './storage';
import { users, pools, recurringContributions, contributions } from '@shared/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import { getUncachableStripeClient } from './stripeClient';

function calculateNextPaymentDate(currentDate: Date, frequency: 'weekly' | 'monthly' | 'quarterly'): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
  }
  return next;
}

async function processBankRecurringContribution(
  recurring: any,
  user: any,
  pool: any,
): Promise<boolean> {
  const contributionAmount = parseFloat(recurring.amount);
  const amountCents = Math.round(contributionAmount * 100);

  if (!recurring.bankAccountId) {
    console.log(`[Cron] No bankAccountId for bank recurring ${recurring.id}, skipping.`);
    await storage.createNotification({
      userId: user.id,
      type: 'contribution',
      title: 'Auto-Contribution Failed',
      message: `Bank account not configured for auto-contribution to "${pool.title}". Please update your recurring contribution settings.`,
      link: `/pool/${pool.id}`,
    });
    return false;
  }

  const bankAccount = await storage.getBankAccountById(recurring.bankAccountId);
  if (!bankAccount) {
    console.log(`[Cron] Bank account ${recurring.bankAccountId} not found for recurring ${recurring.id}.`);
    await storage.createNotification({
      userId: user.id,
      type: 'contribution',
      title: 'Auto-Contribution Failed',
      message: `Bank account no longer exists for auto-contribution to "${pool.title}". Please update your payment method.`,
      link: `/pool/${pool.id}`,
    });
    return false;
  }

  if (!bankAccount.stripeFinancialConnectionsAccountId) {
    console.log(`[Cron] Bank account ${bankAccount.id} not properly linked for recurring ${recurring.id}.`);
    await storage.createNotification({
      userId: user.id,
      type: 'contribution',
      title: 'Auto-Contribution Failed',
      message: `Your bank account needs to be re-linked for auto-contributions to "${pool.title}". Please go to Settings and re-link your bank account.`,
      link: `/pool/${pool.id}`,
    });
    return false;
  }

  let paymentMethodId = bankAccount.stripePaymentMethodId;
  const stripe = await getUncachableStripeClient();

  if (!paymentMethodId && user.stripeCustomerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'us_bank_account',
      });
      const matchingPM = paymentMethods.data.find((pm: any) => pm.us_bank_account?.last4 === bankAccount.accountMask);
      if (matchingPM) {
        paymentMethodId = matchingPM.id;
        try {
          await storage.updateBankAccount(bankAccount.id, { stripePaymentMethodId: matchingPM.id });
        } catch (updateErr) {
          console.log('[Cron] Could not store payment method ID');
        }
      }
    } catch (e: any) {
      console.log('[Cron] Could not retrieve payment methods:', e.message);
    }
  }

  if (!paymentMethodId || !user.stripeCustomerId) {
    console.log(`[Cron] No payment method available for bank recurring ${recurring.id}.`);
    await storage.createNotification({
      userId: user.id,
      type: 'contribution',
      title: 'Auto-Contribution Failed',
      message: `Your bank account needs to be re-linked for auto-contributions to "${pool.title}". Please go to Settings and re-link your bank account.`,
      link: `/pool/${pool.id}`,
    });
    return false;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: '127.0.0.1',
            user_agent: 'ChipInPool-CronJob',
          },
        },
      },
      metadata: {
        poolId: pool.id,
        userId: user.id,
        bankAccountId: bankAccount.id,
        paymentType: 'recurring_bank_ach_cron',
      },
    });

    console.log(`[Cron] Bank PaymentIntent ${paymentIntent.id} status: ${paymentIntent.status}`);

    if (paymentIntent.status === 'processing' || paymentIntent.status === 'succeeded') {
      const nextPaymentDate = calculateNextPaymentDate(new Date(), recurring.frequency);

      await storage.createContribution({
        poolId: pool.id,
        userId: user.id,
        amount: recurring.amount,
        stripeSessionId: paymentIntent.id,
      });

      const currentAmount = parseFloat(pool.currentAmount || '0');
      const newAmount = currentAmount + contributionAmount;
      await storage.updatePoolAmount(pool.id, newAmount.toFixed(2));

      await storage.updateRecurringContribution(recurring.id, { nextPaymentDate });

      await storage.createNotification({
        userId: user.id,
        type: 'contribution',
        title: 'Auto-Contribution Successful',
        message: `Your automatic bank contribution of $${contributionAmount} to "${pool.title}" was processed successfully.`,
        link: `/pool/${pool.id}`,
      });

      return true;
    } else {
      console.log(`[Cron] Bank payment failed with status: ${paymentIntent.status}`);
      await storage.createNotification({
        userId: user.id,
        type: 'contribution',
        title: 'Auto-Contribution Failed',
        message: `Your automatic bank contribution of $${contributionAmount} to "${pool.title}" failed. Status: ${paymentIntent.status}. Please check your bank account.`,
        link: `/pool/${pool.id}`,
      });
      return false;
    }
  } catch (paymentError: any) {
    console.error(`[Cron] Bank payment error for recurring ${recurring.id}:`, paymentError.message);
    await storage.createNotification({
      userId: user.id,
      type: 'contribution',
      title: 'Auto-Contribution Failed',
      message: `Your automatic bank contribution of $${contributionAmount} to "${pool.title}" failed: ${paymentError.message}`,
      link: `/pool/${pool.id}`,
    });
    return false;
  }
}

async function processRecurringContributions(): Promise<void> {
  console.log('[Cron] Processing recurring contributions...');
  
  try {
    const dueContributions = await storage.getDueRecurringContributions();
    
    if (dueContributions.length === 0) {
      console.log('[Cron] No recurring contributions due.');
      return;
    }

    console.log(`[Cron] Found ${dueContributions.length} due recurring contributions.`);

    for (const recurring of dueContributions) {
      try {
        const user = await storage.getUser(recurring.userId);
        if (!user) {
          console.log(`[Cron] User ${recurring.userId} not found for recurring ${recurring.id}, cancelling.`);
          await storage.updateRecurringContribution(recurring.id, { status: 'cancelled' });
          continue;
        }

        if (user.suspended) {
          console.log(`[Cron] User ${user.id} is suspended, skipping recurring ${recurring.id}.`);
          continue;
        }

        const pool = await storage.getPool(recurring.poolId);
        if (!pool) {
          console.log(`[Cron] Pool ${recurring.poolId} not found for recurring ${recurring.id}, cancelling.`);
          await storage.updateRecurringContribution(recurring.id, { status: 'cancelled' });
          continue;
        }

        if (pool.status !== 'active') {
          console.log(`[Cron] Pool ${pool.id} is not active (status: ${pool.status}), skipping recurring ${recurring.id}.`);
          await storage.updateRecurringContribution(recurring.id, { status: 'paused' });
          continue;
        }

        const recurringPaymentMethod = recurring.paymentMethod || 'wallet';

        if (recurringPaymentMethod === 'bank') {
          const success = await processBankRecurringContribution(recurring, user, pool);
          if (success) {
            console.log(`[Cron] Successfully processed bank recurring contribution ${recurring.id} for user ${user.id}`);
          }
          continue;
        }

        const contributionAmount = parseFloat(recurring.amount);
        const userBalance = parseFloat(user.balance);

        if (userBalance < contributionAmount) {
          console.log(`[Cron] Insufficient balance for user ${user.id}. Balance: $${userBalance}, Required: $${contributionAmount}`);
          
          await storage.createNotification({
            userId: user.id,
            type: 'contribution',
            title: 'Auto-Contribution Failed',
            message: `Insufficient wallet balance for auto-contribution of $${contributionAmount} to "${pool.title}". Please add funds to continue.`,
            link: `/pool/${pool.id}`,
          });
          continue;
        }

        const nextPaymentDate = calculateNextPaymentDate(new Date(), recurring.frequency);

        await db.transaction(async (tx) => {
          const [freshRecurring] = await tx.select()
            .from(recurringContributions)
            .where(eq(recurringContributions.id, recurring.id))
            .limit(1);

          if (!freshRecurring || freshRecurring.status !== 'active') {
            console.log(`[Cron] Recurring ${recurring.id} is no longer active, skipping.`);
            return;
          }

          if (new Date(freshRecurring.nextPaymentDate) > new Date()) {
            console.log(`[Cron] Recurring ${recurring.id} already processed (nextPaymentDate moved), skipping.`);
            return;
          }

          const [freshUser] = await tx.select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (!freshUser || parseFloat(freshUser.balance) < contributionAmount) {
            console.log(`[Cron] Balance re-check failed for user ${user.id} in transaction.`);
            return;
          }

          await tx.update(recurringContributions)
            .set({ nextPaymentDate })
            .where(eq(recurringContributions.id, recurring.id));

          await tx.update(users)
            .set({ balance: sql`${users.balance} - ${contributionAmount}` })
            .where(eq(users.id, user.id));

          await tx.insert(contributions).values({
            poolId: pool.id,
            userId: user.id,
            amount: recurring.amount,
          });

          await tx.update(pools)
            .set({ 
              currentAmount: sql`${pools.currentAmount} + ${contributionAmount}`,
              updatedAt: new Date()
            })
            .where(eq(pools.id, pool.id));
        });

        await storage.createNotification({
          userId: user.id,
          type: 'contribution',
          title: 'Auto-Contribution Successful',
          message: `Your automatic contribution of $${contributionAmount} to "${pool.title}" was processed successfully.`,
          link: `/pool/${pool.id}`,
        });

        console.log(`[Cron] Successfully processed recurring contribution ${recurring.id} for user ${user.id}`);
      } catch (error) {
        console.error(`[Cron] Error processing recurring ${recurring.id}:`, error);
      }
    }

    console.log('[Cron] Finished processing recurring contributions.');
  } catch (error) {
    console.error('[Cron] Error in recurring contributions job:', error);
  }
}

export function startCronJobs(): void {
  console.log('[Cron] Starting cron jobs...');
  
  cron.schedule('0 * * * *', () => {
    processRecurringContributions();
  }, {
    scheduled: true,
    timezone: 'America/New_York'
  });

  console.log('[Cron] Recurring contributions job scheduled to run every hour.');
  
  setTimeout(() => {
    processRecurringContributions();
  }, 10000);
}
