import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// Default items for players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const cleanUsername = username.trim().toUpperCase()

    // Find player with inventory
    const player = await prisma.player.findUnique({
      where: { username: cleanUsername },
      include: { inventory: true },
    })

    if (!player || !player.passwordHash || !player.passwordSalt) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password
    const hashedAttempt = hashPassword(password, player.passwordSalt)
    if (hashedAttempt !== player.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Generate new token
    const token = generateToken()
    await prisma.player.update({
      where: { id: player.id },
      data: { authToken: token },
    })

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
      success: true,
      token,
      user: {
        id: player.id,
        username: player.username,
        createdAt: player.createdAt.toISOString(),
      },
      // Return server data so client can sync (override localStorage)
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

