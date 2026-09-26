import Stripe from 'stripe';
import env from '@/config/env';

let client = null;

export function isStripeConfigured() {
  return Boolean(env.stripeSecretKey);
}

// Lazy singleton — throws only when actually used, never at import time,
// so `next build` (which imports every route) succeeds without Stripe keys.
// Callers should catch this and return 503 (billing unavailable).
export function getStripe() {
  if (!env.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
  }
  if (!client) {
    client = new Stripe(env.stripeSecretKey, {
      apiVersion: '2023-10-16', // Use latest stable version or match your account
      typescript: false,
    });
  }
  return client;
}
