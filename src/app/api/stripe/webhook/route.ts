import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { LOOT_CRATES, rollCrateItems } from '@/lib/customizationData'
import Stripe from 'stripe'

// Force dynamic rendering since this route uses headers
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Find the purchased crate
      const purchasedCrate = await prisma.purchasedCrate.findFirst({
        where: { stripeSessionId: session.id },
      })
      
      if (purchasedCrate) {
        // Get the crate type to determine items
        const crate = LOOT_CRATES.find(c => c.id === purchasedCrate.crateType)
        
        if (crate) {
          // Pre-determine the items at purchase time
          const items = rollCrateItems(crate)
          const itemIds = items.map(item => item.id)
          
          // Update the crate with payment ID and pre-determined items
          await prisma.purchasedCrate.update({
            where: { id: purchasedCrate.id },
            data: {
              stripePaymentId: (session.payment_intent as string) || `session_${session.id}`,
              itemsReceived: itemIds,
            },
          })
          
          console.log(`Payment completed for session ${session.id}, items: ${itemIds.join(', ')}`)
        } else {
          // Fallback: just set payment ID
          await prisma.purchasedCrate.update({
            where: { id: purchasedCrate.id },
            data: {
              stripePaymentId: (session.payment_intent as string) || `session_${session.id}`,
            },
          })
          console.log(`Payment completed for session ${session.id}, but crate type not found`)
        }
      } else {
        console.log(`Payment completed for session ${session.id}, but no crate found`)
      }
      break
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.error(`Payment failed for ${paymentIntent.id}`)
      
      // Optionally delete the pending crate
      // await prisma.purchasedCrate.deleteMany({
      //   where: { stripePaymentId: paymentIntent.id },
      // })
      break
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs'

