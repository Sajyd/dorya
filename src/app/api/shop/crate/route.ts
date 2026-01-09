import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LOOT_CRATES, openCrate, getDefaultItems } from '@/lib/customization-data'
import { CrateType } from '@/types/game'

export async function POST(request: Request) {
  try {
    const { username, crateType, usePremium } = await request.json()

    if (!username || !crateType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) {
      return NextResponse.json(
        { error: 'Crate not found' },
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
          doryaCoins: 500,
          inventory: {
            create: {
              ownedItems: getDefaultItems(),
            },
          },
        },
        include: { inventory: true },
      })
    }

    // Check currency and deduct atomically
    if (usePremium) {
      if (player.premiumCoins < crate.premiumPrice) {
        return NextResponse.json(
          { error: 'Not enough premium coins' },
          { status: 400 }
        )
      }

      // Atomic update: only decrement if we have enough coins, and never go below 0
      const newPremiumCoins = Math.max(0, player.premiumCoins - crate.premiumPrice)
      await prisma.player.update({
        where: { id: player.id },
        data: { premiumCoins: newPremiumCoins },
      })
    } else {
      if (player.doryaCoins < crate.price) {
        return NextResponse.json(
          { error: 'Not enough Dorya coins' },
          { status: 400 }
        )
      }

      // Atomic update: only decrement if we have enough coins, and never go below 0
      const newDoryaCoins = Math.max(0, player.doryaCoins - crate.price)
      await prisma.player.update({
        where: { id: player.id },
        data: { doryaCoins: newDoryaCoins },
      })
    }

    // Open crate
    const items = openCrate(crate)
    const ownedItems = (player.inventory?.ownedItems as string[]) || []
    
    // Add new items to inventory
    const newItemIds: string[] = []
    let refundCoins = 0
    
    items.forEach(item => {
      if (ownedItems.includes(item.id)) {
        // Duplicate - refund some coins based on rarity
        const refundAmounts = { common: 20, rare: 50, epic: 100, legendary: 200 }
        refundCoins += refundAmounts[item.rarity]
      } else {
        newItemIds.push(item.id)
      }
    })

    // Update inventory with new items
    if (newItemIds.length > 0 || refundCoins > 0) {
      await prisma.$transaction([
        prisma.playerInventory.update({
          where: { playerId: player.id },
          data: {
            ownedItems: [...ownedItems, ...newItemIds],
          },
        }),
        ...(refundCoins > 0 ? [
          prisma.player.update({
            where: { id: player.id },
            data: { doryaCoins: { increment: refundCoins } },
          }),
        ] : []),
      ])
    }

    // Record crate open
    await prisma.crateOpen.create({
      data: {
        playerId: player.id,
        crateType,
        itemsReceived: items.map(i => i.id),
        coinsSpent: usePremium ? 0 : crate.price,
        premiumSpent: usePremium ? crate.premiumPrice : 0,
      },
    })

    // Build response items with proper type narrowing for visual properties
    const responseItems = items.map(item => {
      const baseItem = {
        id: item.id,
        name: item.name,
        category: item.category,
        rarity: item.rarity,
        isNew: !ownedItems.includes(item.id),
      }
      
      // Add category-specific visual properties
      if (item.category === 'stage') {
        return {
          ...baseItem,
          floorColor: item.floorColor,
          gridColor: item.gridColor,
          accentColor: item.accentColor,
        }
      } else if (item.category === 'electric_color') {
        return {
          ...baseItem,
          primaryColor: item.primaryColor,
          secondaryColor: item.secondaryColor,
        }
      } else if (item.category === 'character') {
        return {
          ...baseItem,
          skinColor: item.skinColor,
          clothColor: item.clothColor,
          glowColor: item.glowColor,
        }
      } else if (item.category === 'dummy') {
        return {
          ...baseItem,
          skinColor: item.skinColor,
          clothColor: item.clothColor,
        }
      }
      return baseItem
    })

    return NextResponse.json({
      success: true,
      items: responseItems,
      refundCoins,
    })
  } catch (error) {
    console.error('Crate open error:', error)
    return NextResponse.json(
      { error: 'Failed to open crate' },
      { status: 500 }
    )
  }
}

