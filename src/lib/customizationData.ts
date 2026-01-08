import {
  StageItem,
  ElectricColorItem,
  CharacterItem,
  DummyItem,
  LootCrate,
  ShopItem,
} from '@/types/game'

// ============================================
// STAGES
// ============================================
export const STAGES: StageItem[] = [
  {
    id: 'stage_classic',
    name: 'Mishima Dojo',
    category: 'stage',
    rarity: 'common',
    price: 0, // Default free
    floorColor: '#0a0a0a',
    gridColor: '#1a1a3a',
    accentColor: '#00d4ff',
    fogColor: '#000000',
    ambientLight: '#303030',
    spotlightColor: '#ffffff',
  },
  {
    id: 'stage_volcanic',
    name: 'Volcanic Pit',
    category: 'stage',
    rarity: 'rare',
    price: 2500,
    floorColor: '#1a0a0a',
    gridColor: '#3a1a1a',
    accentColor: '#ff4400',
    fogColor: '#1a0500',
    ambientLight: '#402010',
    spotlightColor: '#ff6600',
  },
  {
    id: 'stage_neon_tokyo',
    name: 'Neon Tokyo',
    category: 'stage',
    rarity: 'epic',
    price: 5000,
    floorColor: '#0a0a12',
    gridColor: '#ff00ff',
    accentColor: '#00ffff',
    fogColor: '#0a0012',
    ambientLight: '#201030',
    spotlightColor: '#ff00ff',
  },
  {
    id: 'stage_arctic',
    name: 'Arctic Temple',
    category: 'stage',
    rarity: 'rare',
    price: 2500,
    floorColor: '#0a1a1a',
    gridColor: '#4a6a7a',
    accentColor: '#88ddff',
    fogColor: '#102030',
    ambientLight: '#405060',
    spotlightColor: '#aaddff',
  },
  {
    id: 'stage_void',
    name: 'Devil\'s Void',
    category: 'stage',
    rarity: 'legendary',
    price: 10000,
    premiumPrice: 499,
    floorColor: '#050008',
    gridColor: '#4a0060',
    accentColor: '#9d4edd',
    fogColor: '#100018',
    ambientLight: '#200030',
    spotlightColor: '#aa00ff',
  },
  {
    id: 'stage_golden',
    name: 'Golden Throne',
    category: 'stage',
    rarity: 'legendary',
    price: 10000,
    premiumPrice: 499,
    floorColor: '#1a1500',
    gridColor: '#4a3a00',
    accentColor: '#ffd700',
    fogColor: '#0a0800',
    ambientLight: '#403000',
    spotlightColor: '#ffcc00',
  },
  {
    id: 'stage_matrix',
    name: 'Digital Matrix',
    category: 'stage',
    rarity: 'epic',
    price: 5000,
    floorColor: '#000a00',
    gridColor: '#00ff00',
    accentColor: '#00ff44',
    fogColor: '#001000',
    ambientLight: '#002000',
    spotlightColor: '#00ff00',
  },
  {
    id: 'stage_sunset',
    name: 'Sunset Beach',
    category: 'stage',
    rarity: 'rare',
    price: 2500,
    floorColor: '#1a1008',
    gridColor: '#ff8844',
    accentColor: '#ff6600',
    fogColor: '#201008',
    ambientLight: '#604020',
    spotlightColor: '#ffaa66',
  },
]

// ============================================
// ELECTRIC COLORS
// ============================================
export const ELECTRIC_COLORS: ElectricColorItem[] = [
  {
    id: 'electric_blue',
    name: 'Classic Blue',
    category: 'electric_color',
    rarity: 'common',
    price: 0,
    primaryColor: '#00d4ff',
    secondaryColor: '#9d4edd',
    particleColor: '#00ffff',
  },
  {
    id: 'electric_gold',
    name: 'Perfect Gold',
    category: 'electric_color',
    rarity: 'rare',
    price: 1500,
    primaryColor: '#ffd700',
    secondaryColor: '#ff8c00',
    particleColor: '#ffee00',
  },
  {
    id: 'electric_crimson',
    name: 'Devil Crimson',
    category: 'electric_color',
    rarity: 'epic',
    price: 3500,
    primaryColor: '#ff1744',
    secondaryColor: '#aa0000',
    particleColor: '#ff4466',
  },
  {
    id: 'electric_purple',
    name: 'Phantom Purple',
    category: 'electric_color',
    rarity: 'rare',
    price: 1500,
    primaryColor: '#9d4edd',
    secondaryColor: '#6a0dad',
    particleColor: '#bb66ff',
  },
  {
    id: 'electric_green',
    name: 'Toxic Green',
    category: 'electric_color',
    rarity: 'rare',
    price: 1500,
    primaryColor: '#00ff44',
    secondaryColor: '#008822',
    particleColor: '#66ff88',
  },
  {
    id: 'electric_white',
    name: 'Pure White',
    category: 'electric_color',
    rarity: 'epic',
    price: 3500,
    primaryColor: '#ffffff',
    secondaryColor: '#aaaaff',
    particleColor: '#ffffff',
  },
  {
    id: 'electric_rainbow',
    name: 'Rainbow Storm',
    category: 'electric_color',
    rarity: 'legendary',
    price: 8000,
    premiumPrice: 299,
    primaryColor: '#ff0000',
    secondaryColor: '#00ff00',
    particleColor: '#0000ff',
  },
  {
    id: 'electric_void',
    name: 'Void Black',
    category: 'electric_color',
    rarity: 'legendary',
    price: 8000,
    premiumPrice: 299,
    primaryColor: '#220033',
    secondaryColor: '#000000',
    particleColor: '#440066',
  },
  {
    id: 'electric_sakura',
    name: 'Sakura Pink',
    category: 'electric_color',
    rarity: 'rare',
    price: 1500,
    primaryColor: '#ff69b4',
    secondaryColor: '#ff1493',
    particleColor: '#ffb6c1',
  },
  {
    id: 'electric_ice',
    name: 'Frozen Ice',
    category: 'electric_color',
    rarity: 'epic',
    price: 3500,
    primaryColor: '#88ddff',
    secondaryColor: '#0088aa',
    particleColor: '#aaeeff',
  },
]

// ============================================
// CHARACTER MODELS
// ============================================
export const CHARACTERS: CharacterItem[] = [
  {
    id: 'char_mishima',
    name: 'Mishima Classic',
    category: 'character',
    rarity: 'common',
    price: 0,
    preview: '/assets/img/mishimaclassic.png',
    skinColor: '#d4a574',
    clothColor: '#1a1a2e',
    hairColor: '#1a1a1a',
    hairStyle: 'spiky',
    modelPath: '/assets/models/characters/mishimaclassic.glb',
  },
  {
    id: 'char_devil',
    name: 'Devil Form',
    category: 'character',
    rarity: 'legendary',
    price: 12000,
    premiumPrice: 699,
    preview: '/assets/img/devilform.png',
    skinColor: '#8866aa',
    clothColor: '#220033',
    hairColor: '#ffffff',
    hairStyle: 'spiky',
    glowColor: '#9d4edd',
    modelPath: '/assets/models/characters/devilform.glb',
  },
  {
    id: 'char_tekken_force',
    name: 'Tekken Force',
    category: 'character',
    rarity: 'rare',
    price: 3000,
    preview: '/assets/img/tekkenforce.png',
    skinColor: '#c4a484',
    clothColor: '#2a3a2a',
    hairColor: '#3a3a3a',
    hairStyle: 'mohawk',
    modelPath: '/assets/models/characters/tekkenforce.glb',
  },
  {
    id: 'char_cyber',
    name: 'Cyber Ninja',
    category: 'character',
    rarity: 'epic',
    price: 6000,
    preview: '/assets/img/cyberninja.png',
    skinColor: '#888888',
    clothColor: '#001a2a',
    hairColor: '#00d4ff',
    hairStyle: 'slicked',
    glowColor: '#00d4ff',
    modelPath: '/assets/models/characters/cyberninja.glb',
  },
  {
    id: 'char_golden_dragon',
    name: 'Golden Dragon',
    category: 'character',
    rarity: 'legendary',
    price: 12000,
    premiumPrice: 699,
    preview: '/assets/img/goldendragon.png',
    skinColor: '#e8c090',
    clothColor: '#8b4513',
    hairColor: '#ffd700',
    hairStyle: 'long',
    glowColor: '#ffd700',
    modelPath: '/assets/models/characters/goldendragon.glb',
  },
  {
    id: 'char_shadow',
    name: 'Shadow Master',
    category: 'character',
    rarity: 'epic',
    price: 6000,
    preview: '/assets/img/shadowmaster.png',
    skinColor: '#333333',
    clothColor: '#111111',
    hairColor: '#000000',
    hairStyle: 'slicked',
    glowColor: '#440066',
    modelPath: '/assets/models/characters/shadowmaster.glb',
  },
  {
    id: 'char_retro',
    name: 'Retro Fighter',
    category: 'character',
    rarity: 'rare',
    price: 3000,
    preview: '/assets/img/retrofighter.png',
    skinColor: '#ffd4b8',
    clothColor: '#ff0000',
    hairColor: '#8b4513',
    hairStyle: 'bald',
    modelPath: '/assets/models/characters/retrofighter.glb',
  },
  {
    id: 'char_ice_warrior',
    name: 'Ice Warrior',
    category: 'character',
    rarity: 'epic',
    price: 6000,
    preview: '/assets/img/icewarrior.png',
    skinColor: '#b8d4e8',
    clothColor: '#003344',
    hairColor: '#aaddff',
    hairStyle: 'spiky',
    glowColor: '#88ddff',
    modelPath: '/assets/models/characters/icewarrior.glb',
  },
]

// ============================================
// DUMMY MODELS
// ============================================
export const DUMMIES: DummyItem[] = [
  {
    id: 'dummy_classic',
    name: 'Classic Opponent',
    category: 'dummy',
    rarity: 'common',
    price: 0,
    preview: '/assets/img/classicoponnent.png',
    skinColor: '#c9a078',
    clothColor: '#4a1515',
    style: 'classic',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
  {
    id: 'dummy_training',
    name: 'Training Dummy',
    category: 'dummy',
    rarity: 'rare',
    price: 2000,
    preview: '/assets/img/trainingdummy.png',
    skinColor: '#b5651d',
    clothColor: '#8b4513',
    style: 'training_dummy',
    modelPath: '/assets/models/dummies/trainingdummy.glb',
  },
  {
    id: 'dummy_robot',
    name: 'Combat Robot',
    category: 'dummy',
    rarity: 'epic',
    price: 4500,
    preview: '/assets/img/combatrobot.png',
    skinColor: '#808080',
    clothColor: '#404040',
    style: 'robot',
    modelPath: '/assets/models/dummies/combatrobot.glb',
  },
  {
    id: 'dummy_shadow',
    name: 'Shadow Clone',
    category: 'dummy',
    rarity: 'epic',
    price: 4500,
    preview: '/assets/img/mishimaclassic.png',
    skinColor: '#222222',
    clothColor: '#111111',
    style: 'shadow',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
  {
    id: 'dummy_hologram',
    name: 'Hologram',
    category: 'dummy',
    rarity: 'legendary',
    price: 9000,
    premiumPrice: 399,
    preview: '/assets/img/mishimaclassic.png',
    skinColor: '#00ffff',
    clothColor: '#0088aa',
    style: 'hologram',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
]

// ============================================
// LOOT CRATES
// ============================================
export const LOOT_CRATES: LootCrate[] = [
  {
    id: 'basic',
    name: 'Basic Crate',
    description: 'Contains 1 item. Common and Rare items.',
    price: 500,
    premiumPrice: 99,
    itemCount: 1,
    rarityWeights: {
      common: 60,
      rare: 35,
      epic: 4,
      legendary: 1,
    },
  },
  {
    id: 'premium',
    name: 'Premium Crate',
    description: 'Contains 3 items. Guaranteed at least Rare!',
    price: 2000,
    premiumPrice: 299,
    itemCount: 3,
    guaranteedRarity: 'rare',
    rarityWeights: {
      common: 0,
      rare: 60,
      epic: 30,
      legendary: 10,
    },
  },
  {
    id: 'legendary',
    name: 'Legendary Crate',
    description: 'Contains 5 items. Guaranteed Legendary!',
    price: 7500,
    premiumPrice: 699,
    itemCount: 5,
    guaranteedRarity: 'legendary',
    rarityWeights: {
      common: 0,
      rare: 20,
      epic: 50,
      legendary: 30,
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAllItems(): ShopItem[] {
  return [...STAGES, ...ELECTRIC_COLORS, ...CHARACTERS, ...DUMMIES]
}

export function getItemById(id: string): ShopItem | undefined {
  return getAllItems().find(item => item.id === id)
}

export function getItemsByCategory(category: string): ShopItem[] {
  return getAllItems().filter(item => item.category === category)
}

export function getItemsByRarity(rarity: string): ShopItem[] {
  return getAllItems().filter(item => item.rarity === rarity)
}

export function getDefaultItems(): {
  stage: StageItem
  electricColor: ElectricColorItem
  character: CharacterItem
  dummy: DummyItem
} {
  return {
    stage: STAGES.find(s => s.id === 'stage_classic')!,
    electricColor: ELECTRIC_COLORS.find(e => e.id === 'electric_blue')!,
    character: CHARACTERS.find(c => c.id === 'char_mishima')!,
    dummy: DUMMIES.find(d => d.id === 'dummy_classic')!,
  }
}

// Calculate coins earned from a game session
export function calculateCoinsEarned(
  perfectCount: number,
  goodCount: number,
  maxStreak: number,
  isPewgfMode: boolean
): number {
  let coins = 0
  
  // Base coins per successful Dorya
  coins += perfectCount * 10 // 10 coins per perfect
  coins += goodCount * 5 // 5 coins per good
  
  // Streak bonus
  if (maxStreak >= 5) coins += 25
  if (maxStreak >= 10) coins += 50
  if (maxStreak >= 25) coins += 100
  if (maxStreak >= 50) coins += 250
  if (maxStreak >= 100) coins += 500
  
  // Mode bonus
  if (isPewgfMode) {
    coins = Math.floor(coins * 1.5) // 50% bonus for timed mode
  }
  
  return coins
}

// Roll for items from a crate
export function rollCrateItems(crate: LootCrate): ShopItem[] {
  const items: ShopItem[] = []
  const allItems = getAllItems().filter(item => item.price > 0) // Exclude free items
  const rarityOrder: ('common' | 'rare' | 'epic' | 'legendary')[] = ['common', 'rare', 'epic', 'legendary']
  
  for (let i = 0; i < crate.itemCount; i++) {
    // Determine rarity based on weights
    const roll = Math.random() * 100
    let rarity: 'common' | 'rare' | 'epic' | 'legendary'
    
    if (roll < crate.rarityWeights.legendary) {
      rarity = 'legendary'
    } else if (roll < crate.rarityWeights.legendary + crate.rarityWeights.epic) {
      rarity = 'epic'
    } else if (roll < crate.rarityWeights.legendary + crate.rarityWeights.epic + crate.rarityWeights.rare) {
      rarity = 'rare'
    } else {
      rarity = 'common'
    }
    
    // Guaranteed rarity for first item
    if (i === 0 && crate.guaranteedRarity) {
      const guaranteedIndex = rarityOrder.indexOf(crate.guaranteedRarity)
      const currentIndex = rarityOrder.indexOf(rarity)
      if (currentIndex < guaranteedIndex) {
        rarity = crate.guaranteedRarity
      }
    }
    
    // Get items of this rarity, with fallback to higher rarities if none available
    let eligibleItems = allItems.filter(item => item.rarity === rarity)
    
    // If no items of this rarity, try upgrading to higher rarities
    if (eligibleItems.length === 0) {
      const currentRarityIndex = rarityOrder.indexOf(rarity)
      for (let r = currentRarityIndex + 1; r < rarityOrder.length; r++) {
        eligibleItems = allItems.filter(item => item.rarity === rarityOrder[r])
        if (eligibleItems.length > 0) break
      }
    }
    
    // If still no items (shouldn't happen), try any paid item
    if (eligibleItems.length === 0) {
      eligibleItems = allItems
    }
    
    // Always add an item if we have any eligible items
    if (eligibleItems.length > 0) {
      const randomItem = eligibleItems[Math.floor(Math.random() * eligibleItems.length)]
      items.push(randomItem)
    }
  }
  
  return items
}

// Rarity colors for UI
export const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
}

export const RARITY_GLOW = {
  common: 'rgba(156, 163, 175, 0.3)',
  rare: 'rgba(59, 130, 246, 0.4)',
  epic: 'rgba(168, 85, 247, 0.5)',
  legendary: 'rgba(251, 191, 36, 0.6)',
}

