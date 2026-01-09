import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const AUTH_TOKEN_COOKIE = 'dorya_auth_token'

// Default items for players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const player = await prisma.player.findFirst({
      where: { 
        authToken: token,
        passwordHash: { not: null }, // Only registered users
      },
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

    const ownedItems = (inventory.ownedItems as string[]) ?? DEFAULT_OWNED_ITEMS

    return NextResponse.json({
      id: player.id,
      username: player.username,
      createdAt: player.createdAt.toISOString(),
      playerData: {
        currency: {
          doryaCoins: player.doryaCoins,
          premiumCoins: player.premiumCoins,
        },
        inventory: {
          ownedItems,
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
