import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LOOT_CRATES, rollCrateItems, getItemById } from '@/lib/customizationData'

export async function POST(request: Request) {
  try {
    const { crateId, username } = await request.json()

    if (!crateId || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find the purchased crate
    const purchasedCrate = await prisma.purchasedCrate.findUnique({
      where: { id: crateId },
      include: { player: { include: { inventory: true } } },
    })

    if (!purchasedCrate) {
      return NextResponse.json(
        { error: 'Crate not found' },
        { status: 404 }
      )
    }

    if (purchasedCrate.player.username !== username.toUpperCase()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (purchasedCrate.isOpened) {
      return NextResponse.json(
        { error: 'Crate already opened' },
        { status: 400 }
      )
    }

    if (!purchasedCrate.stripePaymentId) {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    const crate = LOOT_CRATES.find(c => c.id === purchasedCrate.crateType)
    if (!crate) {
      return NextResponse.json(
        { error: 'Invalid crate type' },
        { status: 400 }
      )
    }

    // Get items - either pre-determined (from webhook/verify) or generate now as fallback
    let itemIds = purchasedCrate.itemsReceived as string[] | null
    if (!itemIds || itemIds.length === 0) {
      // Fallback: generate items now if webhook/verify didn't set them
      const generatedItems = rollCrateItems(crate)
      itemIds = generatedItems.map(item => item.id)
    }
    
    // Convert item IDs to full item objects
    const items = itemIds
      .map(id => getItemById(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
    
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid items in crate' },
        { status: 500 }
      )
    }
    
    const ownedItems = (purchasedCrate.player.inventory?.ownedItems as string[]) || []
    
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

    // Update inventory and mark crate as opened
    await prisma.$transaction([
      // Update purchased crate
      prisma.purchasedCrate.update({
        where: { id: crateId },
        data: {
          isOpened: true,
          openedAt: new Date(),
          itemsReceived: items.map(i => i.id),
        },
      }),
      // Update inventory
      ...(newItemIds.length > 0 ? [
        prisma.playerInventory.update({
          where: { playerId: purchasedCrate.playerId },
          data: {
            ownedItems: [...ownedItems, ...newItemIds],
          },
        }),
      ] : []),
      // Refund coins for duplicates
      ...(refundCoins > 0 ? [
        prisma.player.update({
          where: { id: purchasedCrate.playerId },
          data: { doryaCoins: { increment: refundCoins } },
        }),
      ] : []),
      // Record in crate history
      prisma.crateOpen.create({
        data: {
          playerId: purchasedCrate.playerId,
          crateType: purchasedCrate.crateType,
          itemsReceived: items.map(i => i.id),
          coinsSpent: 0,
          premiumSpent: crate.premiumPrice,
        },
      }),
    ])

    // Build response items with proper type narrowing
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
    console.error('Open crate error:', error)
    return NextResponse.json(
      { error: 'Failed to open crate' },
      { status: 500 }
    )
  }
}


