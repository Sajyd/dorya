import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { 
  LOOT_CRATES, 
  rollCrateItems, 
  getItemById,
  getAllItems 
} from '@/lib/customizationData'
import { CrateType } from '@/types/game'

// GET all available shop items
export async function GET() {
  try {
    const items = getAllItems().filter(item => item.price > 0)
    const crates = LOOT_CRATES
    
    return NextResponse.json({
      items,
      crates,
    })
  } catch (error) {
    console.error('Error fetching shop items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop items' },
      { status: 500 }
    )
  }
}

// POST to purchase item or open crate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, action, itemId, crateType, usePremium } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      )
    }

    // Get or create player
    let player = await prisma.player.findUnique({
      where: { username },
      include: { inventory: true },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username,
          inventory: {
            create: {
              ownedItems: JSON.stringify(['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic']),
            },
          },
        },
        include: { inventory: true },
      })
    }

    if (!player.inventory) {
      await prisma.playerInventory.create({
        data: {
          playerId: player.id,
          ownedItems: JSON.stringify(['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic']),
        },
      })
      player = await prisma.player.findUnique({
        where: { username },
        include: { inventory: true },
      })
    }

    const ownedItems: string[] = JSON.parse(player!.inventory!.ownedItems as string)

    if (action === 'purchase_item') {
      const item = getItemById(itemId)
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      if (ownedItems.includes(itemId)) {
        return NextResponse.json({ error: 'Already owned' }, { status: 400 })
      }

      const cost = usePremium ? (item.premiumPrice || 0) : item.price
      const currencyField = usePremium ? 'premiumCoins' : 'doryaCoins'

      if (player![currencyField] < cost) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }

      // Process purchase
      const newOwnedItems = [...ownedItems, itemId]
      
      await prisma.$transaction([
        prisma.player.update({
          where: { id: player!.id },
          data: { [currencyField]: { decrement: cost } },
        }),
        prisma.playerInventory.update({
          where: { id: player!.inventory!.id },
          data: { ownedItems: JSON.stringify(newOwnedItems) },
        }),
      ])

      return NextResponse.json({
        success: true,
        item,
        newBalance: player![currencyField] - cost,
      })

    } else if (action === 'open_crate') {
      const crate = LOOT_CRATES.find(c => c.id === crateType)
      if (!crate) {
        return NextResponse.json({ error: 'Crate not found' }, { status: 404 })
      }

      const cost = usePremium ? crate.premiumPrice : crate.price
      const currencyField = usePremium ? 'premiumCoins' : 'doryaCoins'

      if (player![currencyField] < cost) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }

      // Roll items
      const items = rollCrateItems(crate)
      const newItems = items.filter(item => !ownedItems.includes(item.id))
      const duplicates = items.filter(item => ownedItems.includes(item.id))
      
      // Calculate refund for duplicates (10% of value)
      const refundAmount = duplicates.reduce((sum, item) => sum + Math.floor(item.price * 0.1), 0)
      
      // Update inventory
      const newOwnedItems = [...ownedItems, ...newItems.map(i => i.id)]
      
      await prisma.$transaction([
        prisma.player.update({
          where: { id: player!.id },
          data: { 
            [currencyField]: { decrement: cost },
            doryaCoins: { increment: refundAmount },
          },
        }),
        prisma.playerInventory.update({
          where: { id: player!.inventory!.id },
          data: { ownedItems: JSON.stringify(newOwnedItems) },
        }),
        prisma.crateOpen.create({
          data: {
            playerId: player!.id,
            crateType: crateType as string,
            itemsReceived: JSON.stringify(items.map(i => i.id)),
            coinsSpent: usePremium ? 0 : cost,
            premiumSpent: usePremium ? cost : 0,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        items,
        newItems: newItems.map(i => i.id),
        duplicates: duplicates.map(i => i.id),
        refundAmount,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing shop action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

