import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getItemById } from '@/lib/customizationData'

export async function POST(request: Request) {
  try {
    const { username, itemId, usePremium } = await request.json()

    if (!username || !itemId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const item = getItemById(itemId)
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Find or create player
    let player = await prisma.player.findUnique({
      where: { username: username.toUpperCase() },
      include: { inventory: true },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username: username.toUpperCase(),
          doryaCoins: 500, // Starting coins
          inventory: {
            create: {
              ownedItems: JSON.stringify(['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']),
            },
          },
        },
        include: { inventory: true },
      })
    }

    // Check if already owned - parse ownedItems (may be JSON string or array)
    let ownedItems: string[] = []
    const rawOwnedItems = player.inventory?.ownedItems
    if (rawOwnedItems) {
      if (typeof rawOwnedItems === 'string') {
        try {
          ownedItems = JSON.parse(rawOwnedItems)
        } catch {
          ownedItems = []
        }
      } else if (Array.isArray(rawOwnedItems)) {
        ownedItems = rawOwnedItems
      }
    }
    if (ownedItems.includes(itemId)) {
      return NextResponse.json(
        { error: 'Item already owned' },
        { status: 400 }
      )
    }

    // Check currency and deduct atomically
    if (usePremium && item.premiumPrice) {
      if (player.premiumCoins < item.premiumPrice) {
        return NextResponse.json(
          { error: 'Not enough premium coins' },
          { status: 400 }
        )
      }

      // Deduct premium coins (never go below 0)
      const newPremiumCoins = Math.max(0, player.premiumCoins - item.premiumPrice)
      await prisma.player.update({
        where: { id: player.id },
        data: { premiumCoins: newPremiumCoins },
      })
    } else {
      if (player.doryaCoins < item.price) {
        return NextResponse.json(
          { error: 'Not enough Dorya coins' },
          { status: 400 }
        )
      }

      // Deduct coins (never go below 0)
      const newDoryaCoins = Math.max(0, player.doryaCoins - item.price)
      await prisma.player.update({
        where: { id: player.id },
        data: { doryaCoins: newDoryaCoins },
      })
    }

    // Add item to inventory - save as JSON string for consistency
    await prisma.playerInventory.update({
      where: { playerId: player.id },
      data: {
        ownedItems: JSON.stringify([...ownedItems, itemId]),
      },
    })

    return NextResponse.json({
      success: true,
      itemId,
      itemName: item.name,
    })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to purchase item' },
      { status: 500 }
    )
  }
}

