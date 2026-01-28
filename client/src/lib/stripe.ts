import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
let cachedPublishableKey: string | null = null;

export async function getStripePublishableKey(): Promise<string> {
  if (cachedPublishableKey) {
    return cachedPublishableKey;
  }

  const envKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (envKey && typeof envKey === 'string' && envKey.startsWith('pk_')) {
    cachedPublishableKey = envKey;
    return envKey;
  }

  // Fetch from server API
  const res = await fetch('/api/stripe/config', {
    credentials: 'include',
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch Stripe publishable key');
  }
  
  const data = await res.json();
  
  if (!data.publishableKey || typeof data.publishableKey !== 'string') {
    throw new Error('Invalid Stripe publishable key received from server');
  }
  
  cachedPublishableKey = data.publishableKey;
  return data.publishableKey;
}

export async function getStripeInstance(): Promise<Stripe | null> {
  const promise = getStripePromise();
  return promise;
}

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = getStripePublishableKey()
      .then(key => {
        if (!key || typeof key !== 'string' || !key.startsWith('pk_')) {
          console.error('Invalid Stripe key received:', typeof key);
          throw new Error('Invalid Stripe publishable key');
        }
        return loadStripe(key);
      })
      .catch(error => {
        console.error('Failed to initialize Stripe:', error);
        return null;
      });
  }
  return stripePromise;
}
