import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'

const AUTH_TOKEN_COOKIE = 'dorya_auth_token'
const GUEST_TOKEN_COOKIE = 'dorya_guest_token'

// Default items for new players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']
const DEFAULT_DORYA_COINS = 500

function generateGuestUsername(): string {
  const randomNum = Math.floor(Math.random() * 9000000000) + 1000000000
  return `DORYA_${randomNum}`
}

function generateGuestToken(): string {
  return `guest_${randomBytes(32).toString('hex')}`
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Invalidate the current auth token in the database
    const authToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
    if (authToken) {
      await prisma.player.updateMany({
        where: { authToken },
        data: { authToken: null },
      })
    }
    
    // Create a new guest session
    const newGuestToken = generateGuestToken()
    const username = generateGuestUsername()
    
    const player = await prisma.player.create({
      data: {
        username,
        authToken: newGuestToken,
        doryaCoins: DEFAULT_DORYA_COINS,
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
    
    const response = NextResponse.json({
      success: true,
      isGuest: true,
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
          ownedItems: DEFAULT_OWNED_ITEMS,
          selectedStage: 'stage_classic',
          selectedElectricColor: 'electric_blue',
          selectedCharacter: 'char_mishima',
          selectedDummy: 'dummy_classic',
        },
      },
    })
    
    // Clear auth token cookie
    response.cookies.delete(AUTH_TOKEN_COOKIE)
    
    // Set new guest token cookie
    response.cookies.set(GUEST_TOKEN_COOKIE, newGuestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}



