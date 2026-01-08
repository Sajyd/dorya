import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Get all unopened crates for a player
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const player = await prisma.player.findUnique({
      where: { username: username.toUpperCase() },
      include: {
        purchasedCrates: {
          where: {
            isOpened: false,
            stripePaymentId: { not: null }, // Only show paid crates
          },
          orderBy: { purchasedAt: 'desc' },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ crates: [] })
    }

    return NextResponse.json({
      crates: player.purchasedCrates.map(crate => ({
        id: crate.id,
        crateType: crate.crateType,
        purchasedAt: crate.purchasedAt,
      })),
    })
  } catch (error) {
    console.error('Get crates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crates' },
      { status: 500 }
    )
  }
}

