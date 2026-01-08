import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { STAGES, ELECTRIC_COLORS, CHARACTERS, DUMMIES } from '@/lib/customizationData'

// GET player inventory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      )
    }

    const player = await prisma.player.findUnique({
      where: { username },
      include: { inventory: true },
    })

    if (!player) {
      // Return default inventory for new players
      return NextResponse.json({
        currency: {
          doryaCoins: 100,
          premiumCoins: 0,
        },
        inventory: {
          ownedItems: ['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic'],
          selectedStage: 'stage_classic',
          selectedElectricColor: 'electric_blue',
          selectedCharacter: 'char_mishima',
          selectedDummy: 'dummy_classic',
        },
        activeCustomization: {
          stage: STAGES.find(s => s.id === 'stage_classic'),
          electricColor: ELECTRIC_COLORS.find(e => e.id === 'electric_blue'),
          character: CHARACTERS.find(c => c.id === 'char_mishima'),
          dummy: DUMMIES.find(d => d.id === 'dummy_classic'),
        },
      })
    }

    const ownedItems: string[] = player.inventory 
      ? JSON.parse(player.inventory.ownedItems as string)
      : ['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic']

    return NextResponse.json({
      currency: {
        doryaCoins: player.doryaCoins,
        premiumCoins: player.premiumCoins,
      },
      inventory: {
        ownedItems,
        selectedStage: player.inventory?.selectedStage || 'stage_classic',
        selectedElectricColor: player.inventory?.selectedElectricColor || 'electric_blue',
        selectedCharacter: player.inventory?.selectedCharacter || 'char_mishima',
        selectedDummy: player.inventory?.selectedDummy || 'dummy_classic',
      },
      activeCustomization: {
        stage: STAGES.find(s => s.id === (player.inventory?.selectedStage || 'stage_classic')),
        electricColor: ELECTRIC_COLORS.find(e => e.id === (player.inventory?.selectedElectricColor || 'electric_blue')),
        character: CHARACTERS.find(c => c.id === (player.inventory?.selectedCharacter || 'char_mishima')),
        dummy: DUMMIES.find(d => d.id === (player.inventory?.selectedDummy || 'dummy_classic')),
      },
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// PUT to update selected items
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, selectedStage, selectedElectricColor, selectedCharacter, selectedDummy } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      )
    }

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
              selectedStage: selectedStage || 'stage_classic',
              selectedElectricColor: selectedElectricColor || 'electric_blue',
              selectedCharacter: selectedCharacter || 'char_mishima',
              selectedDummy: selectedDummy || 'dummy_classic',
            },
          },
        },
        include: { inventory: true },
      })
    }

    const ownedItems: string[] = JSON.parse(player.inventory?.ownedItems as string || '[]')

    // Validate ownership
    const updateData: Record<string, string> = {}
    
    if (selectedStage && ownedItems.includes(selectedStage)) {
      updateData.selectedStage = selectedStage
    }
    if (selectedElectricColor && ownedItems.includes(selectedElectricColor)) {
      updateData.selectedElectricColor = selectedElectricColor
    }
    if (selectedCharacter && ownedItems.includes(selectedCharacter)) {
      updateData.selectedCharacter = selectedCharacter
    }
    if (selectedDummy && ownedItems.includes(selectedDummy)) {
      updateData.selectedDummy = selectedDummy
    }

    if (Object.keys(updateData).length > 0 && player.inventory) {
      await prisma.playerInventory.update({
        where: { id: player.inventory.id },
        data: updateData,
      })
    }

    return NextResponse.json({ success: true, updated: updateData })
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

// POST to add coins (from gameplay)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, doryaCoins, premiumCoins } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      )
    }

    let player = await prisma.player.findUnique({
      where: { username },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username,
          doryaCoins: doryaCoins || 0,
          premiumCoins: premiumCoins || 0,
          inventory: {
            create: {
              ownedItems: JSON.stringify(['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic']),
            },
          },
        },
      })
    } else {
      player = await prisma.player.update({
        where: { id: player.id },
        data: {
          doryaCoins: { increment: doryaCoins || 0 },
          premiumCoins: { increment: premiumCoins || 0 },
        },
      })
    }

    return NextResponse.json({
      success: true,
      doryaCoins: player.doryaCoins,
      premiumCoins: player.premiumCoins,
    })
  } catch (error) {
    console.error('Error adding coins:', error)
    return NextResponse.json(
      { error: 'Failed to add coins' },
      { status: 500 }
    )
  }
}
