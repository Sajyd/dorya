import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

// Force dynamic rendering since this route uses cookies
export const dynamic = 'force-dynamic'

const GUEST_TOKEN_COOKIE = 'dorya_guest_token'
const AUTH_TOKEN_COOKIE = 'dorya_auth_token'

// Helper to get player from request cookies
async function getPlayerFromCookies() {
  const cookieStore = await cookies()
  
  // Check auth token first
  const authToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  if (authToken) {
    const player = await prisma.player.findUnique({
      where: { authToken },
      include: { inventory: true },
    })
    if (player) return { player, isGuest: false }
  }
  
  // Check guest token
  const guestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value
  if (guestToken) {
    const player = await prisma.player.findFirst({
      where: { 
        authToken: guestToken,
        passwordHash: null,
      },
      include: { inventory: true },
    })
    if (player) return { player, isGuest: true }
  }
  
  return null
}

// POST - Sync player data (currency, inventory, selections)
export async function POST(request: NextRequest) {
  try {
    const result = await getPlayerFromCookies()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { player } = result
    const body = await request.json()
    const { 
      currency, 
      inventory,
      addCoins,
      addPremiumCoins,
      addOwnedItems,
      setSelection,
      keybindings,
      userSettings,
    } = body
    
    // Build update data for player
    const playerUpdate: Record<string, unknown> = {}
    
    // Handle absolute currency update
    if (currency) {
      if (typeof currency.doryaCoins === 'number') {
        playerUpdate.doryaCoins = Math.max(0, currency.doryaCoins)
      }
      if (typeof currency.premiumCoins === 'number') {
        playerUpdate.premiumCoins = Math.max(0, currency.premiumCoins)
      }
    }
    
    // Handle incremental coin updates
    if (typeof addCoins === 'number') {
      playerUpdate.doryaCoins = { increment: addCoins }
    }
    if (typeof addPremiumCoins === 'number') {
      playerUpdate.premiumCoins = { increment: addPremiumCoins }
    }
    
    // Update player if needed
    let updatedPlayer = player
    if (Object.keys(playerUpdate).length > 0) {
      updatedPlayer = await prisma.player.update({
        where: { id: player.id },
        data: playerUpdate,
        include: { inventory: true },
      })
    }
    
    // Handle inventory updates
    const inventoryUpdate: Record<string, unknown> = {}
    
    // Handle adding new owned items
    if (addOwnedItems && Array.isArray(addOwnedItems) && addOwnedItems.length > 0) {
      const currentItems = (player.inventory?.ownedItems as string[]) ?? []
      const newItems = [...new Set([...currentItems, ...addOwnedItems])]
      inventoryUpdate.ownedItems = newItems
    }
    
    // Handle full inventory update
    if (inventory) {
      if (inventory.ownedItems && Array.isArray(inventory.ownedItems)) {
        inventoryUpdate.ownedItems = inventory.ownedItems
      }
      if (inventory.selectedStage) {
        inventoryUpdate.selectedStage = inventory.selectedStage
      }
      if (inventory.selectedElectricColor) {
        inventoryUpdate.selectedElectricColor = inventory.selectedElectricColor
      }
      if (inventory.selectedCharacter) {
        inventoryUpdate.selectedCharacter = inventory.selectedCharacter
      }
      if (inventory.selectedDummy) {
        inventoryUpdate.selectedDummy = inventory.selectedDummy
      }
    }
    
    // Handle selection update
    if (setSelection) {
      const { type, itemId } = setSelection
      const currentItems = (player.inventory?.ownedItems as string[]) ?? []
      
      // Only allow selection if item is owned
      if (currentItems.includes(itemId)) {
        switch (type) {
          case 'stage':
            inventoryUpdate.selectedStage = itemId
            break
          case 'electric_color':
            inventoryUpdate.selectedElectricColor = itemId
            break
          case 'character':
            inventoryUpdate.selectedCharacter = itemId
            break
          case 'dummy':
            inventoryUpdate.selectedDummy = itemId
            break
        }
      }
    }
    
    // Handle keybindings update
    if (keybindings) {
      // Validate keybindings object
      const validKeys = ['forward', 'down', 'punch']
      const sanitizedKeybindings: Record<string, string> = {}
      
      for (const key of validKeys) {
        if (typeof keybindings[key] === 'string' && keybindings[key].length > 0) {
          sanitizedKeybindings[key] = keybindings[key]
        }
      }
      
      if (Object.keys(sanitizedKeybindings).length > 0) {
        // Merge with existing keybindings
        const existingKeybindings = (player.inventory?.keybindings as Record<string, string>) ?? {
          forward: 'KeyD',
          down: 'KeyS',
          punch: 'KeyK',
        }
        inventoryUpdate.keybindings = { ...existingKeybindings, ...sanitizedKeybindings }
      }
    }
    
    // Handle userSettings update
    if (userSettings) {
      const defaultSettings = {
        musicEnabled: true,
        sfxEnabled: true,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        showFps: false,
        graphicsQuality: 'high',
      }
      
      const existingSettings = (player.inventory?.userSettings as typeof defaultSettings) ?? defaultSettings
      const sanitizedSettings: Record<string, unknown> = { ...existingSettings }
      
      // Validate and merge settings
      if (typeof userSettings.musicEnabled === 'boolean') {
        sanitizedSettings.musicEnabled = userSettings.musicEnabled
      }
      if (typeof userSettings.sfxEnabled === 'boolean') {
        sanitizedSettings.sfxEnabled = userSettings.sfxEnabled
      }
      if (typeof userSettings.musicVolume === 'number') {
        sanitizedSettings.musicVolume = Math.max(0, Math.min(1, userSettings.musicVolume))
      }
      if (typeof userSettings.sfxVolume === 'number') {
        sanitizedSettings.sfxVolume = Math.max(0, Math.min(1, userSettings.sfxVolume))
      }
      if (typeof userSettings.showFps === 'boolean') {
        sanitizedSettings.showFps = userSettings.showFps
      }
      if (['low', 'medium', 'high'].includes(userSettings.graphicsQuality)) {
        sanitizedSettings.graphicsQuality = userSettings.graphicsQuality
      }
      
      inventoryUpdate.userSettings = sanitizedSettings
    }
    
    // Update inventory if needed
    let updatedInventory = player.inventory
    if (Object.keys(inventoryUpdate).length > 0) {
      if (player.inventory) {
        updatedInventory = await prisma.playerInventory.update({
          where: { id: player.inventory.id },
          data: inventoryUpdate,
        })
      } else {
        // Create inventory if it doesn't exist
        updatedInventory = await prisma.playerInventory.create({
          data: {
            playerId: player.id,
            ownedItems: (inventoryUpdate.ownedItems as string[]) ?? ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic'],
            selectedStage: (inventoryUpdate.selectedStage as string) ?? 'stage_classic',
            selectedElectricColor: (inventoryUpdate.selectedElectricColor as string) ?? 'electric_blue',
            selectedCharacter: (inventoryUpdate.selectedCharacter as string) ?? 'char_mishima',
            selectedDummy: (inventoryUpdate.selectedDummy as string) ?? 'dummy_classic',
          },
        })
      }
    }
    
    const ownedItems = (updatedInventory?.ownedItems as string[]) ?? ['stage_classic', 'electric_blue', 'electric_gold', 'char_mishima', 'dummy_classic']
    const playerKeybindings = (updatedInventory?.keybindings as { forward: string; down: string; punch: string }) ?? {
      forward: 'KeyD',
      down: 'KeyS',
      punch: 'KeyK',
    }
    const playerUserSettings = (updatedInventory?.userSettings as {
      musicEnabled: boolean
      sfxEnabled: boolean
      musicVolume: number
      sfxVolume: number
      showFps: boolean
      graphicsQuality: string
    }) ?? {
      musicEnabled: true,
      sfxEnabled: true,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      showFps: false,
      graphicsQuality: 'high',
    }
    
    return NextResponse.json({
      success: true,
      playerData: {
        currency: {
          doryaCoins: updatedPlayer.doryaCoins,
          premiumCoins: updatedPlayer.premiumCoins,
        },
        inventory: {
          ownedItems,
          selectedStage: updatedInventory?.selectedStage ?? 'stage_classic',
          selectedElectricColor: updatedInventory?.selectedElectricColor ?? 'electric_blue',
          selectedCharacter: updatedInventory?.selectedCharacter ?? 'char_mishima',
          selectedDummy: updatedInventory?.selectedDummy ?? 'dummy_classic',
          keybindings: playerKeybindings,
          userSettings: playerUserSettings,
        },
      },
    })
  } catch (error) {
    console.error('Player sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync player data' },
      { status: 500 }
    )
  }
}

// PUT - Update guest username
export async function PUT(request: NextRequest) {
  try {
    const result = await getPlayerFromCookies()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { player, isGuest } = result
    
    if (!isGuest) {
      return NextResponse.json(
        { error: 'Cannot change username for registered accounts' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { username } = body
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }
    
    const cleanUsername = username.trim().toUpperCase()
    
    // Validate username
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
    
    // Check if username is taken by a registered user
    const existingPlayer = await prisma.player.findUnique({
      where: { username: cleanUsername },
    })
    
    if (existingPlayer && existingPlayer.id !== player.id && existingPlayer.passwordHash) {
      return NextResponse.json(
        { error: 'Username is taken by a registered user' },
        { status: 409 }
      )
    }
    
    // Update username
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: { username: cleanUsername },
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedPlayer.id,
        username: updatedPlayer.username,
        createdAt: updatedPlayer.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Username update error:', error)
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    )
  }
}

