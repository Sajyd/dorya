import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Verify a checkout session and return the crate info
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      )
    }

    // Find the purchased crate
    const purchasedCrate = await prisma.purchasedCrate.findFirst({
      where: { stripeSessionId: sessionId },
      include: { player: true },
    })

    if (!purchasedCrate) {
      return NextResponse.json(
        { error: 'Crate not found' },
        { status: 404 }
      )
    }

    // Ensure the payment ID is saved (in case webhook hasn't fired yet)
    if (!purchasedCrate.stripePaymentId && session.payment_intent) {
      await prisma.purchasedCrate.update({
        where: { id: purchasedCrate.id },
        data: { stripePaymentId: session.payment_intent as string },
      })
    }

    return NextResponse.json({
      success: true,
      crate: {
        id: purchasedCrate.id,
        crateType: purchasedCrate.crateType,
        isOpened: purchasedCrate.isOpened,
      },
      player: {
        username: purchasedCrate.player.username,
      },
    })
  } catch (error) {
    console.error('Verify session error:', error)
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    )
  }
}

