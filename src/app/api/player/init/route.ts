import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'

const GUEST_TOKEN_COOKIE = 'dorya_guest_token'
const AUTH_TOKEN_COOKIE = 'dorya_auth_token'

// Default items for new players
const DEFAULT_OWNED_ITEMS = ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']
const DEFAULT_DORYA_COINS = 500
const DEFAULT_KEYBINDINGS = { forward: 'KeyD', down: 'KeyS', punch: 'KeyK' }
const DEFAULT_USER_SETTINGS = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  showFps: false,
  graphicsQuality: 'high' as const,
}

function generateGuestUsername(): string {
  const randomNum = Math.floor(Math.random() * 9000000000) + 1000000000
  return `DORYA_${randomNum}`
}

function generateGuestToken(): string {
  return `guest_${randomBytes(32).toString('hex')}`
}

// GET - Initialize or retrieve player session
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Check for authenticated user first
    const authToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
    if (authToken) {
      const player = await prisma.player.findUnique({
        where: { authToken },
        include: { inventory: true },
      })
      
      if (player) {
        const ownedItems = player.inventory?.ownedItems as string[] ?? DEFAULT_OWNED_ITEMS
        const keybindings = (player.inventory?.keybindings as { forward: string; down: string; punch: string }) ?? DEFAULT_KEYBINDINGS
        const userSettings = (player.inventory?.userSettings as typeof DEFAULT_USER_SETTINGS) ?? DEFAULT_USER_SETTINGS
        
        return NextResponse.json({
          success: true,
          isGuest: false,
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
              selectedStage: player.inventory?.selectedStage ?? 'stage_classic',
              selectedElectricColor: player.inventory?.selectedElectricColor ?? 'electric_blue',
              selectedCharacter: player.inventory?.selectedCharacter ?? 'char_mishima',
              selectedDummy: player.inventory?.selectedDummy ?? 'dummy_classic',
              keybindings,
              userSettings,
            },
          },
        })
      }
    }
    
    // Check for existing guest token
    const guestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value
    if (guestToken) {
      const player = await prisma.player.findFirst({
        where: { 
          authToken: guestToken,
          passwordHash: null, // Guest users have no password
        },
        include: { inventory: true },
      })
      
      if (player) {
        const ownedItems = player.inventory?.ownedItems as string[] ?? DEFAULT_OWNED_ITEMS
        const keybindings = (player.inventory?.keybindings as { forward: string; down: string; punch: string }) ?? DEFAULT_KEYBINDINGS
        const userSettings = (player.inventory?.userSettings as typeof DEFAULT_USER_SETTINGS) ?? DEFAULT_USER_SETTINGS
        
        return NextResponse.json({
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
              ownedItems,
              selectedStage: player.inventory?.selectedStage ?? 'stage_classic',
              selectedElectricColor: player.inventory?.selectedElectricColor ?? 'electric_blue',
              selectedCharacter: player.inventory?.selectedCharacter ?? 'char_mishima',
              selectedDummy: player.inventory?.selectedDummy ?? 'dummy_classic',
              keybindings,
              userSettings,
            },
          },
        })
      }
    }
    
    // Create new guest player
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
    
    // Set the guest token cookie
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
          keybindings: DEFAULT_KEYBINDINGS,
          userSettings: DEFAULT_USER_SETTINGS,
        },
      },
    })
    
    response.cookies.set(GUEST_TOKEN_COOKIE, newGuestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Player init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize player' },
      { status: 500 }
    )
  }
}

