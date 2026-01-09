import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

const AUTH_TOKEN_COOKIE = 'dorya_auth_token'
const GUEST_TOKEN_COOKIE = 'dorya_guest_token'

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
    const cookieStore = await cookies()
    const body = await request.json()
    const { username, password } = body

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

    // Check if username exists (by a registered user with password)
    const existingRegistered = await prisma.player.findFirst({
      where: { 
        username: cleanUsername,
        passwordHash: { not: null },
      },
    })

    if (existingRegistered) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Generate salt and hash password
    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)
    const token = generateToken()

    // Check if we have an existing guest session to upgrade
    const guestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value
    let existingGuestPlayer = null
    
    if (guestToken) {
      existingGuestPlayer = await prisma.player.findFirst({
        where: { 
          authToken: guestToken,
          passwordHash: null, // Guest user
        },
        include: { inventory: true },
      })
    }

    let player
    let inventory

    if (existingGuestPlayer) {
      // Upgrade existing guest player to registered account
      player = await prisma.player.update({
        where: { id: existingGuestPlayer.id },
        data: {
          username: cleanUsername,
          passwordHash,
          passwordSalt: salt,
          authToken: token,
        },
        include: { inventory: true },
      })
      inventory = player.inventory
      
      // Create inventory if missing
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
    } else {
      // Create new registered player
      player = await prisma.player.create({
        data: {
          username: cleanUsername,
          passwordHash,
          passwordSalt: salt,
          authToken: token,
          doryaCoins: 500, // Starting bonus
          premiumCoins: 0,
          inventory: {
            create: {
              ownedItems: DEFAULT_OWNED_ITEMS,
              selectedStage: 'stage_classic',
              selectedElectricColor: 'electric_blue',
              selectedCharacter: 'char_mishima',
              selectedDummy: 'dummy_classic',
            },
          },
        },
        include: { inventory: true },
      })
      inventory = player.inventory
    }

    const ownedItems = (inventory?.ownedItems as string[]) ?? DEFAULT_OWNED_ITEMS

    const response = NextResponse.json({
      success: true,
      user: {
        id: player.id,
        username: player.username,
        createdAt: player.createdAt.toISOString(),
      },
      playerData: {
        currency: {
          doryaCoins: player.doryaCoins,
          premiumCoins: player.premiumCoins,
        },
        inventory: {
          ownedItems,
          selectedStage: inventory?.selectedStage ?? 'stage_classic',
          selectedElectricColor: inventory?.selectedElectricColor ?? 'electric_blue',
          selectedCharacter: inventory?.selectedCharacter ?? 'char_mishima',
          selectedDummy: inventory?.selectedDummy ?? 'dummy_classic',
        },
      },
    })

    // Set auth token cookie
    response.cookies.set(AUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Clear guest token cookie
    response.cookies.delete(GUEST_TOKEN_COOKIE)

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
