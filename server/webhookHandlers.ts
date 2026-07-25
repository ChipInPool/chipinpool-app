import { getStripeSync, getUncachableStripeClient, isReplitEnvironment } from './stripeClient';
import { storage } from './storage';
import { sendPoolContributionNotification, sendWalletActivityNotification, sendPoolCompletedNotification } from './notificationService';
import { sendPushNotification } from './pushService';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    if (isReplitEnvironment()) {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);

      try {
        const stripe = await getUncachableStripeClient();
        const webhookSecret = await sync.getManagedWebhookSecret();

        if (webhookSecret) {
          const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
          await WebhookHandlers.routeEvent(event);
        }
      } catch (err: any) {
        console.error('Custom webhook handler error:', err.message);
      }
    } else {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable not set');
      }

      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      await WebhookHandlers.routeEvent(event);
    }
  }

  static async routeEvent(event: any): Promise<void> {
    console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);
    
    if (event.type === 'checkout.session.completed') {
      await WebhookHandlers.handleCheckoutCompleted(event.data.object);
    } else if (event.type === 'checkout.session.expired') {
      await WebhookHandlers.handleCheckoutExpired(event.data.object);
    } else if (event.type === 'identity.verification_session.verified') {
      await WebhookHandlers.handleIdentityVerified(event.data.object);
    } else if (event.type === 'identity.verification_session.requires_input') {
      await WebhookHandlers.handleIdentityFailed(event.data.object);
    } else if (event.type === 'financial_connections.account.created') {
      await WebhookHandlers.handleFinancialConnectionsAccountCreated(event.data.object);
    } else if (event.type === 'financial_connections.account.refreshed_ownership') {
      await WebhookHandlers.handleFinancialConnectionsAccountUpdated(event.data.object);
    } else if (event.type === 'payout.paid') {
      await WebhookHandlers.handlePayoutPaid(event.data.object);
    } else if (event.type === 'payout.failed') {
      await WebhookHandlers.handlePayoutFailed(event.data.object);
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'charge.failed') {
      await WebhookHandlers.handlePaymentFailed(event.data.object);
    } else {
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  }

  // An ACH contribution is credited to a pool while the payment is still
  // 'processing'. If Stripe later reports the PaymentIntent/charge failed or was
  // returned, reverse the pool credit so creators can't withdraw money that
  // never settled. Idempotent: a repeated webhook finds nothing to reverse.
  static async handlePaymentFailed(object: any): Promise<void> {
    // For charge.failed the PaymentIntent id is on object.payment_intent;
    // for payment_intent.payment_failed the id is object.id.
    const paymentIntentId: string | undefined = object?.payment_intent || object?.id;
    if (!paymentIntentId) {
      console.log('[Webhook] payment_failed with no PaymentIntent id, skipping');
      return;
    }

    try {
      const reversed = await storage.reverseContributionByStripeSession(paymentIntentId);
      if (!reversed) {
        console.log(`[Webhook] payment_failed ${paymentIntentId}: no matching contribution to reverse`);
        return;
      }

      console.warn(`[Webhook] Reversed ACH contribution of $${reversed.amount} to pool ${reversed.poolId} (PaymentIntent ${paymentIntentId} failed/returned)`);

      // Record the reversal for auditability
      try {
        await storage.createPoolActivity({
          poolId: reversed.poolId,
          userId: reversed.userId || undefined,
          type: 'refund',
          amount: reversed.amount,
          description: 'ACH contribution reversed (payment failed or returned)',
        } as any);
      } catch (activityErr) {
        console.error('[Webhook] Could not record reversal activity:', activityErr);
      }

      // Notify the contributor that their bank payment did not clear
      if (reversed.userId) {
        const user = await storage.getUser(reversed.userId);
        if (user) {
          await storage.createNotification({
            userId: reversed.userId,
            type: 'contribution',
            title: 'Bank payment failed',
            message: `Your bank contribution of $${parseFloat(reversed.amount).toFixed(2)} could not be completed and has been reversed.`,
            link: `/pool/${reversed.poolId}`,
          });
          if (user.notifyPush) {
            sendPushNotification(
              reversed.userId,
              'Bank payment failed',
              `Your $${parseFloat(reversed.amount).toFixed(2)} bank contribution was reversed.`,
              `/pool/${reversed.poolId}`,
            ).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.error('[Webhook] Error reversing failed ACH contribution:', err.message);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const { type, poolId, userId, amount } = session.metadata || {};
    const sessionId = session.id;
    const guestEmail = session.customer_email || null;

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('Checkout session not paid:', sessionId);
      return;
    }

    // Handle wallet deposits with idempotency
    if (type === 'wallet_deposit') {
      if (!userId || !amount) {
        console.log('Wallet deposit missing metadata:', { userId, amount });
        return;
      }

      try {
        await storage.createPendingWalletDeposit(userId, amount, sessionId);
        const success = await storage.completeWalletDeposit(sessionId);
        if (success) {
          console.log(`Wallet deposit completed: $${amount} for user ${userId} (session: ${sessionId})`);
          
          // Send wallet deposit notification
          const user = await storage.getUser(userId);
          if (user) {
            await storage.createNotification({
              userId: user.id,
              type: 'contribution',
              title: 'Wallet Deposit Successful',
              message: `$${amount} has been added to your wallet.`,
              link: '/wallet',
            });
            
            // Send email/SMS notification
            sendWalletActivityNotification(
              user.email,
              user.phone,
              `${user.firstName} ${user.lastName}`,
              'deposit',
              amount,
              'completed',
              user.notifyEmail,
              user.notifySMS
            ).catch(err => console.error('[Notification] Wallet deposit notification failed:', err));
          }
        } else {
          console.log(`Wallet deposit already processed for session ${sessionId}`);
        }
      } catch (err: any) {
        console.error('Error processing wallet deposit:', err.message);
      }
      return;
    }
    
    // Handle pool contributions
    if (!poolId || !amount) {
      console.log('Checkout completed but missing metadata:', { poolId, amount });
      return;
    }

    try {
      // Create contribution with idempotence check
      const contribution = await storage.createStripeContribution(
        poolId,
        amount,
        sessionId,
        userId || null,
        guestEmail
      );

      if (contribution) {
        console.log(`Stripe payment processed: $${amount} to pool ${poolId} (session: ${sessionId})`);
        
        // Send notification to pool creator about the contribution
        const pool = await storage.getPool(poolId);
        if (pool) {
          const poolCreator = await storage.getUser(pool.creatorId);
          let contributorName = 'Someone';
          if (guestEmail) {
            contributorName = session.metadata.guestName || 'A guest';
          } else if (userId) {
            const contributor = await storage.getUser(userId);
            if (contributor) {
              contributorName = `${contributor.firstName} ${contributor.lastName || ''}`.trim();
            }
          }
          
          // Create in-app notification
          await storage.createNotification({
            userId: pool.creatorId,
            type: 'contribution',
            title: 'New Contribution',
            message: `${contributorName} chipped in $${amount} to "${pool.title}"`,
            link: `/pool/${pool.id}`,
          });
          
          // Send email/SMS notification to pool creator (only if contributor is not the creator)
          if (poolCreator && pool.creatorId !== userId) {
            sendPoolContributionNotification(
              poolCreator.email,
              poolCreator.phone,
              `${poolCreator.firstName} ${poolCreator.lastName}`,
              contributorName,
              pool.id,
              pool.title,
              amount,
              poolCreator.notifyEmail,
              poolCreator.notifySMS
            ).catch(err => console.error('[Notification] Pool contribution notification failed:', err));
            
            // Send push notification
            sendPushNotification(
              pool.creatorId,
              'New Contribution! 💰',
              `${contributorName} just contributed $${amount} to "${pool.title}"`
            ).catch(err => console.error('[Push] Contribution notification failed:', err));
          }
        }
        
        // Check if pool reached target and handle merchant checkout session completion
        if (pool && parseFloat(pool.currentAmount) >= parseFloat(pool.targetAmount)) {
          // Mark pool as completed if not already
          if (pool.status !== 'completed') {
            await storage.updatePoolStatus(pool.id, 'completed');
            
            // Send pool completion notification
            await storage.createNotification({
              userId: pool.creatorId,
              type: 'goal_reached',
              title: 'Goal Reached! 🎉',
              message: `${pool.title} has been fully funded!`,
              link: `/pool/${pool.id}`,
            });
            
            const creator = await storage.getUser(pool.creatorId);
            if (creator) {
              sendPoolCompletedNotification(
                creator.email,
                creator.phone,
                `${creator.firstName} ${creator.lastName}`,
                pool.id,
                pool.title,
                pool.targetAmount,
                creator.notifyEmail,
                creator.notifySMS
              ).catch(err => console.error('[Notification] Pool completed notification failed:', err));
              
              sendPushNotification(
                pool.creatorId,
                'Goal Reached! 🎉',
                `Congratulations! "${pool.title}" has been fully funded!`
              ).catch(err => console.error('[Push] Pool completion notification failed:', err));
            }
          }
          
          // Check if this pool is linked to a merchant checkout session
          const merchantSession = await storage.getMerchantCheckoutSessionByPoolId(pool.id);
          // Atomically claim the collecting->completed transition so merchant
          // stats are credited exactly once even if this races the API handler.
          if (merchantSession && merchantSession.status === 'collecting' &&
              await storage.completeCheckoutSessionIfCollecting(merchantSession.id, pool.currentAmount)) {
            // Update merchant stats - add net amount to pending balance
            const netAmount = parseFloat(merchantSession.netAmount);
            const feeAmount = parseFloat(merchantSession.feeAmount);
            const totalAmount = parseFloat(merchantSession.amount);
            await storage.updateMerchantStats(merchantSession.merchantId, netAmount, feeAmount, totalAmount);

            // Send webhook to merchant
            const merchant = await storage.getMerchant(merchantSession.merchantId);
            if (merchant?.webhookUrl) {
              await WebhookHandlers.sendMerchantWebhook(merchant, merchantSession.id, 'session.completed', {
                sessionId: merchantSession.id,
                orderId: merchantSession.externalOrderId,
                status: 'completed',
                poolId: pool.id,
                amount: totalAmount,
                netAmount: netAmount,
                feeAmount: feeAmount,
                completedAt: new Date().toISOString(),
              });
            }
            
            console.log(`[ChipInPay] Session ${merchantSession.id} completed via Stripe payment. Merchant ${merchantSession.merchantId} earned $${netAmount.toFixed(2)}`);
          }
        }
      } else {
        console.log(`Payment already processed for session ${sessionId}`);
      }
    } catch (err: any) {
      console.error('Error processing checkout completion:', err.message);
    }
  }
  
  // Helper method to send merchant webhooks
  static async sendMerchantWebhook(merchant: any, sessionId: string, eventType: string, payload: any): Promise<void> {
    if (!merchant.webhookUrl) return;

    // SSRF guard: never let a merchant-controlled URL reach internal services
    const { assertSafeOutboundUrl } = await import('./ssrfGuard');
    const safe = await assertSafeOutboundUrl(merchant.webhookUrl);
    if (!safe.ok) {
      console.error(`[Webhook] Refusing to deliver to unsafe URL (${safe.reason}): ${merchant.webhookUrl}`);
      return;
    }

    const crypto = await import('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signatureData = `${timestamp}.${payloadString}`;
    const signature = crypto.createHmac('sha256', merchant.webhookSecret)
      .update(signatureData)
      .digest('hex');
    
    try {
      const response = await fetch(merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChipInPay-Signature': `t=${timestamp},v1=${signature}`,
          'X-ChipInPay-Event': eventType,
        },
        body: payloadString,
      });
      console.log(`[Webhook] Delivered ${eventType} to ${merchant.webhookUrl}: ${response.status}`);
    } catch (err: any) {
      console.error(`[Webhook] Failed to deliver ${eventType}:`, err.message);
    }
  }

  static async handleCheckoutExpired(session: any): Promise<void> {
    const { type } = session.metadata || {};
    const sessionId = session.id;

    if (type === 'wallet_deposit') {
      try {
        await storage.updateWalletDepositStatus(sessionId, 'failed');
        console.log(`Wallet deposit expired/failed for session ${sessionId}`);
      } catch (err: any) {
        console.error('Error marking wallet deposit as failed:', err.message);
      }
    }
  }

  static async handleIdentityVerified(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    
    if (!userId) {
      console.log('Identity verification missing userId metadata');
      return;
    }

    try {
      await storage.updateUser(userId, { kycStatus: 'verified' });
      console.log(`KYC verified for user ${userId}`);
    } catch (err: any) {
      console.error('Error updating KYC status to verified:', err.message);
    }
  }

  static async handleIdentityFailed(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    
    if (!userId) {
      console.log('Identity verification missing userId metadata');
      return;
    }

    try {
      await storage.updateUser(userId, { kycStatus: 'failed' });
      console.log(`KYC failed for user ${userId}`);
    } catch (err: any) {
      console.error('Error updating KYC status to failed:', err.message);
    }
  }

  static async handleFinancialConnectionsAccountCreated(account: any): Promise<void> {
    const accountId = account.id;
    console.log(`[FC Webhook] Account created: ${accountId}`);
    
    try {
      const stripe = await getUncachableStripeClient();
      
      // Check if we have this account in our database
      const existingAccount = await storage.getBankAccountByStripeAccountId(accountId);
      if (!existingAccount) {
        console.log(`[FC Webhook] Account ${accountId} not found in database, skipping`);
        return;
      }

      // Try to subscribe to get account numbers (requires Stripe approval)
      try {
        await (stripe.financialConnections.accounts as any).subscribe(accountId, {
          features: ['account_numbers'],
        });
        console.log(`[FC Webhook] Subscribed to account numbers for ${accountId}`);
      } catch (subErr: any) {
        console.log(`[FC Webhook] Could not subscribe to account numbers: ${subErr.message}`);
      }

      // Retrieve the account with full details
      const fcAccount = await stripe.financialConnections.accounts.retrieve(accountId) as any;
      
      // Update bank account with routing number if available
      const updates: any = {};
      if (fcAccount.routing_number) {
        updates.routingNumber = fcAccount.routing_number;
      }
      
      // Try to get account numbers if available
      if (fcAccount.account_numbers && fcAccount.account_numbers.length > 0) {
        const accountNumData = fcAccount.account_numbers[0];
        if (accountNumData.account_number) {
          updates.accountNumber = accountNumData.account_number;
        }
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateBankAccountByStripeAccountId(accountId, updates);
        console.log(`[FC Webhook] Updated account ${accountId} with:`, Object.keys(updates));
      }
    } catch (err: any) {
      console.error('[FC Webhook] Error processing account created:', err.message);
    }
  }

  static async handleFinancialConnectionsAccountUpdated(account: any): Promise<void> {
    const accountId = account.id;
    console.log(`[FC Webhook] Account updated/refreshed: ${accountId}`);
    
    try {
      const stripe = await getUncachableStripeClient();
      
      // Check if we have this account in our database
      const existingAccount = await storage.getBankAccountByStripeAccountId(accountId);
      if (!existingAccount) {
        console.log(`[FC Webhook] Account ${accountId} not found in database, skipping`);
        return;
      }

      // Retrieve the account with full details
      const fcAccount = await stripe.financialConnections.accounts.retrieve(accountId) as any;
      
      // Update with any new information
      const updates: any = {};
      if (fcAccount.routing_number && !existingAccount.routingNumber) {
        updates.routingNumber = fcAccount.routing_number;
      }
      
      if (fcAccount.account_numbers && fcAccount.account_numbers.length > 0) {
        const accountNumData = fcAccount.account_numbers[0];
        if (accountNumData.account_number && !existingAccount.accountNumber) {
          updates.accountNumber = accountNumData.account_number;
        }
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateBankAccountByStripeAccountId(accountId, updates);
        console.log(`[FC Webhook] Updated account ${accountId} with:`, Object.keys(updates));
      }
    } catch (err: any) {
      console.error('[FC Webhook] Error processing account update:', err.message);
    }
  }

  static async handlePayoutPaid(payout: any): Promise<void> {
    const payoutId = payout.id;
    const amount = (payout.amount / 100).toFixed(2);
    const currency = (payout.currency || 'usd').toUpperCase();
    const arrivalDate = payout.arrival_date ? new Date(payout.arrival_date * 1000) : null;

    console.log(`[Payout Webhook] Payout paid: ${payoutId}, $${amount} ${currency}, arrival: ${arrivalDate?.toISOString() || 'unknown'}, destination: ${payout.destination || 'unknown'}`);
  }

  static async handlePayoutFailed(payout: any): Promise<void> {
    const payoutId = payout.id;
    const amount = (payout.amount / 100).toFixed(2);
    const failureMessage = payout.failure_message || 'Unknown failure';
    const failureCode = payout.failure_code || 'unknown';

    console.error(`[Payout Webhook] Payout FAILED: ${payoutId}, $${amount}, code: ${failureCode}, message: ${failureMessage}`);
  }
}
