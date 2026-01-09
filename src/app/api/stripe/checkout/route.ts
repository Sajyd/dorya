import { NextResponse } from 'next/server'
import { stripe, CRATE_AMOUNTS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { LOOT_CRATES } from '@/lib/customization-data'
import { CrateType } from '@/types/game'

export async function POST(request: Request) {
  try {
    const { crateType, username } = await request.json()

    if (!crateType || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) {
      return NextResponse.json(
        { error: 'Invalid crate type' },
        { status: 400 }
      )
    }

    // Find or create player
    let player = await prisma.player.findUnique({
      where: { username: username.toUpperCase() },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username: username.toUpperCase(),
          doryaCoins: 500,
          inventory: {
            create: {
              ownedItems: ['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic'],
            },
          },
        },
      })
    }

    const amount = CRATE_AMOUNTS[crateType as keyof typeof CRATE_AMOUNTS]
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: crate.name,
              description: crate.description,
              images: [], // Add crate images if available
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      metadata: {
        crateType,
        playerId: player.id,
        username: player.username,
      },
    })

    // Create a pending purchased crate record
    await prisma.purchasedCrate.create({
      data: {
        playerId: player.id,
        crateType,
        stripeSessionId: session.id,
      },
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}


