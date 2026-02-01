import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

let vapidConfigured = false;

function getVapidKeys(): { publicKey: string; privateKey: string; email: string } {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:support@chipin.app';

  if (!publicKey || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Push] VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in production environment');
    }
    console.log('[Push] Generating new VAPID keys for development...');
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    console.log('[Push] Generated VAPID keys. Set these in environment:');
    console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
  }

  return { publicKey, privateKey, email };
}

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  
  const { publicKey, privateKey, email } = getVapidKeys();
  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
  console.log('[Push] VAPID configured successfully');
}

export function getVapidPublicKey(): string {
  const { publicKey } = getVapidKeys();
  return publicKey;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
  icon?: string
): Promise<void> {
  ensureVapidConfigured();

  const [user] = await db.select({ notifyPush: users.notifyPush })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    console.log(`[Push] User ${userId} not found, skipping push notification`);
    return;
  }

  if (!user.notifyPush) {
    console.log(`[Push] User ${userId} has push notifications disabled, skipping`);
    return;
  }

  const subscriptions = await db.select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) {
    console.log(`[Push] No push subscriptions for user ${userId}`);
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    url: url || '/',
    timestamp: Date.now(),
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log(`[Push] Notification sent to subscription ${sub.id}`);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Subscription ${sub.id} expired, removing...`);
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[Push] Failed to send to subscription ${sub.id}:`, error.message);
          throw error;
        }
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[Push] Sent ${successful}/${subscriptions.length} notifications (${failed} failed)`);
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  const existing = await db.select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  if (existing.length > 0) {
    await db.update(pushSubscriptions)
      .set({ userId, p256dh, auth })
      .where(eq(pushSubscriptions.endpoint, endpoint));
    console.log(`[Push] Updated existing subscription for user ${userId}`);
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh,
      auth,
    });
    console.log(`[Push] Created new subscription for user ${userId}`);
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  console.log(`[Push] Removed subscription with endpoint: ${endpoint.substring(0, 50)}...`);
}

export async function removeAllUserPushSubscriptions(userId: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  console.log(`[Push] Removed all subscriptions for user ${userId}`);
}
