import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { stripe, CRATE_AMOUNTS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { LOOT_CRATES } from '@/lib/customizationData'
import { CrateType } from '@/types/game'

// Force dynamic rendering since this route uses cookies
export const dynamic = 'force-dynamic'

const AUTH_TOKEN_COOKIE = 'dorya_auth_token'

export async function POST(request: Request) {
  try {
    const { crateType, username } = await request.json()

    if (!crateType || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user is authenticated (not a guest) to prevent losing purchases
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'You must be logged in to make purchases. Please sign up or log in to continue.' },
        { status: 401 }
      )
    }

    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) {
      return NextResponse.json(
        { error: 'Invalid crate type' },
        { status: 400 }
      )
    }

    // Find authenticated player by auth token
    const player = await prisma.player.findUnique({
      where: { authToken },
    })

    // Verify player exists, has a password (authenticated), and username matches
    if (!player || !player.passwordHash) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign up or log in.' },
        { status: 401 }
      )
    }

    if (player.username !== username.toUpperCase()) {
      return NextResponse.json(
        { error: 'Username mismatch. Please refresh and try again.' },
        { status: 403 }
      )
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


