import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
let cachedPublishableKey: string | null = null;

export async function getStripePublishableKey(): Promise<string> {
  if (cachedPublishableKey) {
    return cachedPublishableKey;
  }

  const envKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (envKey) {
    cachedPublishableKey = envKey;
    return envKey;
  }

  const res = await fetch('/api/stripe/config', {
    credentials: 'include',
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch Stripe publishable key');
  }
  
  const data = await res.json();
  cachedPublishableKey = data.publishableKey;
  return data.publishableKey;
}

export async function getStripeInstance(): Promise<Stripe | null> {
  const promise = getStripePromise();
  return promise;
}

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = getStripePublishableKey().then(key => loadStripe(key));
  }
  return stripePromise;
}
