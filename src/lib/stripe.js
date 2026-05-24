import Stripe from 'stripe';
import env from '@/config/env';

if (!env.stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
}

export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2023-10-16', // Use latest stable version or match your account
  typescript: false,
});
