import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    price: 29,
    employeeLimit: 10,
    sopLimit: 25 as number,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    price: 79,
    employeeLimit: 50,
    sopLimit: -1 as number,
  },
} as const

export type PlanKey = keyof typeof PLANS
