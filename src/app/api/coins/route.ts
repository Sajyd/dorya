import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultItems } from '@/lib/customizationData'

// POST - Add coins (from gameplay)
export async function POST(request: Request) {
  try {
    const { username, amount, source } = await request.json()

    if (!username || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
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
          doryaCoins: 500 + amount,
          inventory: {
            create: {
              ownedItems: JSON.stringify((() => {
                const defaults = getDefaultItems()
                return [defaults.stage.id, defaults.electricColor.id, defaults.character.id, defaults.dummy.id]
              })()),
            },
          },
        },
      })
    } else {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { doryaCoins: { increment: amount } },
      })
    }

    return NextResponse.json({
      success: true,
      newBalance: player.doryaCoins,
    })
  } catch (error) {
    console.error('Add coins error:', error)
    return NextResponse.json(
      { error: 'Failed to add coins' },
      { status: 500 }
    )
  }
}

// PUT - Purchase premium coins (simulated - in production would verify payment)
export async function PUT(request: Request) {
  try {
    const { username, amount, transactionId } = await request.json()

    if (!username || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // In production, verify transactionId with payment provider here

    // Find or create player
    let player = await prisma.player.findUnique({
      where: { username: username.toUpperCase() },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username: username.toUpperCase(),
          doryaCoins: 500,
          premiumCoins: amount,
          inventory: {
            create: {
              ownedItems: JSON.stringify((() => {
                const defaults = getDefaultItems()
                return [defaults.stage.id, defaults.electricColor.id, defaults.character.id, defaults.dummy.id]
              })()),
            },
          },
        },
      })
    } else {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { premiumCoins: { increment: amount } },
      })
    }

    return NextResponse.json({
      success: true,
      newPremiumBalance: player.premiumCoins,
    })
  } catch (error) {
    console.error('Purchase premium coins error:', error)
    return NextResponse.json(
      { error: 'Failed to purchase premium coins' },
      { status: 500 }
    )
  }
}

