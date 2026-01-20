import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

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

    // First, let stripe-replit-sync handle its sync
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Then handle our custom checkout.session.completed events
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await sync.getManagedWebhookSecret();
      
      if (webhookSecret) {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        
        if (event.type === 'checkout.session.completed') {
          await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        }
      }
    } catch (err: any) {
      console.error('Custom webhook handler error:', err.message);
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
        const success = await storage.createWalletDeposit(userId, amount, sessionId);
        if (success) {
          console.log(`Wallet deposit processed: $${amount} for user ${userId} (session: ${sessionId})`);
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
      } else {
        console.log(`Payment already processed for session ${sessionId}`);
      }
    } catch (err: any) {
      console.error('Error processing checkout completion:', err.message);
    }
  }
}
