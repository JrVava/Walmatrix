import Stripe from 'stripe';
import { config } from '../config';
export const stripeConfig = {
    stripe: new Stripe(config.stripe.SECRET_KEY || '', {
        apiVersion: '2023-08-16',
    }),
    stripePk: new Stripe(config.stripe.PUBLISHED_KEY || '', {
        apiVersion: '2023-08-16',
    }),
    stripeWk: config.stripe.WEBHOOK_KEY,
    coupon: config.stripe.COUPON,
    subscriptionMode: config.stripe.SUBSCRIPTIONMODE,
    currency: config.stripe.CURRENCY,
};
