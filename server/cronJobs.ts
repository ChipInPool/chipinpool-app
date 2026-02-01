import cron from 'node-cron';
import { db } from './db';
import { storage } from './storage';
import { users, pools, recurringContributions, contributions } from '@shared/schema';
import { eq, and, sql, lte } from 'drizzle-orm';

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
