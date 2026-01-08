import Stripe from 'stripe'

// Only throw if we're on the server (not during build)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Price IDs should be set in environment variables in production
// These are the Stripe price IDs for each crate type
export const CRATE_PRICES = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_crate',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_crate',
  legendary: process.env.STRIPE_PRICE_LEGENDARY || 'price_legendary_crate',
}

// Crate prices in cents (matches LOOT_CRATES premiumPrice values)
export const CRATE_AMOUNTS = {
  basic: 99,      // $0.99
  premium: 249,   // $2.49
  legendary: 499, // $4.99
}

