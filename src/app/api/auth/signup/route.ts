import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// Default items for new players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, localData } = body

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const cleanUsername = username.trim().toUpperCase()

    // Validate username format
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters' },
        { status: 400 }
      )
    }

    if (!/^[A-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if username exists
    const existingPlayer = await prisma.player.findUnique({
      where: { username: cleanUsername },
      include: { inventory: true },
    })

    if (existingPlayer && existingPlayer.passwordHash) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Generate salt and hash password
    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)
    const token = generateToken()

    // Extract local data to transfer from guest session
    const guestCoins = Math.max(0, localData?.currency?.doryaCoins ?? 100)
    const guestPremiumCoins = Math.max(0, localData?.currency?.premiumCoins ?? 0)
    const guestOwnedItems = localData?.inventory?.ownedItems ?? DEFAULT_OWNED_ITEMS
    const guestSelectedStage = localData?.inventory?.selectedStage ?? 'stage_classic'
    const guestSelectedElectricColor = localData?.inventory?.selectedElectricColor ?? 'electric_blue'
    const guestSelectedCharacter = localData?.inventory?.selectedCharacter ?? 'char_mishima'
    const guestSelectedDummy = localData?.inventory?.selectedDummy ?? 'dummy_classic'

    // Merge owned items with defaults to ensure defaults are always included
    const mergedOwnedItems = [...new Set([...DEFAULT_OWNED_ITEMS, ...guestOwnedItems])]

    let player
    if (existingPlayer) {
      // Update existing player (from guest submissions) with password
      // Merge coins and inventory - take the higher value to be fair
      const mergedCoins = Math.max(existingPlayer.doryaCoins, guestCoins)
      const mergedPremium = Math.max(existingPlayer.premiumCoins, guestPremiumCoins)
      const existingItems = (existingPlayer.inventory?.ownedItems as string[]) ?? []
      const finalOwnedItems = [...new Set([...existingItems, ...mergedOwnedItems])]

      player = await prisma.player.update({
        where: { id: existingPlayer.id },
        data: {
          passwordHash,
          passwordSalt: salt,
          authToken: token,
          doryaCoins: mergedCoins,
          premiumCoins: mergedPremium,
        },
        include: { inventory: true },
      })

      // Update or create inventory
      if (existingPlayer.inventory) {
        await prisma.playerInventory.update({
          where: { playerId: existingPlayer.id },
          data: {
            ownedItems: finalOwnedItems,
            selectedStage: guestSelectedStage,
            selectedElectricColor: guestSelectedElectricColor,
            selectedCharacter: guestSelectedCharacter,
            selectedDummy: guestSelectedDummy,
          },
        })
      } else {
        await prisma.playerInventory.create({
          data: {
            playerId: existingPlayer.id,
            ownedItems: finalOwnedItems,
            selectedStage: guestSelectedStage,
            selectedElectricColor: guestSelectedElectricColor,
            selectedCharacter: guestSelectedCharacter,
            selectedDummy: guestSelectedDummy,
          },
        })
      }
    } else {
      // Create new player with guest data
      player = await prisma.player.create({
        data: {
          username: cleanUsername,
          passwordHash,
          passwordSalt: salt,
          authToken: token,
          doryaCoins: guestCoins,
          premiumCoins: guestPremiumCoins,
          inventory: {
            create: {
              ownedItems: mergedOwnedItems,
              selectedStage: guestSelectedStage,
              selectedElectricColor: guestSelectedElectricColor,
              selectedCharacter: guestSelectedCharacter,
              selectedDummy: guestSelectedDummy,
            },
          },
        },
        include: { inventory: true },
      })
    }

    // Fetch final player data with inventory
    const finalPlayer = await prisma.player.findUnique({
      where: { id: player.id },
      include: { inventory: true },
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: finalPlayer!.id,
        username: finalPlayer!.username,
        createdAt: finalPlayer!.createdAt.toISOString(),
      },
      // Return the server data so client can sync
      playerData: {
        currency: {
          doryaCoins: finalPlayer!.doryaCoins,
          premiumCoins: finalPlayer!.premiumCoins,
        },
        inventory: {
          ownedItems: finalPlayer!.inventory?.ownedItems ?? mergedOwnedItems,
          selectedStage: finalPlayer!.inventory?.selectedStage ?? guestSelectedStage,
          selectedElectricColor: finalPlayer!.inventory?.selectedElectricColor ?? guestSelectedElectricColor,
          selectedCharacter: finalPlayer!.inventory?.selectedCharacter ?? guestSelectedCharacter,
          selectedDummy: finalPlayer!.inventory?.selectedDummy ?? guestSelectedDummy,
        },
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

