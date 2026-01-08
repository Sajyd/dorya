import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Default items for players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    const player = await prisma.player.findFirst({
      where: { authToken: token },
      include: { inventory: true },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Ensure player has an inventory (create if missing)
    let inventory = player.inventory
    if (!inventory) {
      inventory = await prisma.playerInventory.create({
        data: {
          playerId: player.id,
          ownedItems: DEFAULT_OWNED_ITEMS,
          selectedStage: 'stage_classic',
          selectedElectricColor: 'electric_blue',
          selectedCharacter: 'char_mishima',
          selectedDummy: 'dummy_classic',
        },
      })
    }

    return NextResponse.json({
      id: player.id,
      username: player.username,
      createdAt: player.createdAt.toISOString(),
      // Return server data so client can sync
      playerData: {
        currency: {
          doryaCoins: player.doryaCoins,
          premiumCoins: player.premiumCoins,
        },
        inventory: {
          ownedItems: inventory.ownedItems ?? DEFAULT_OWNED_ITEMS,
          selectedStage: inventory.selectedStage ?? 'stage_classic',
          selectedElectricColor: inventory.selectedElectricColor ?? 'electric_blue',
          selectedCharacter: inventory.selectedCharacter ?? 'char_mishima',
          selectedDummy: inventory.selectedDummy ?? 'dummy_classic',
        },
      },
    })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

