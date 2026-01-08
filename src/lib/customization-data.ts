import { 
  StageItem, 
  ElectricColorItem, 
  CharacterItem, 
  DummyItem, 
  LootCrate,
  ShopItem 
} from '@/types/game'

// ============================================
// STAGES
// ============================================
export const STAGES: StageItem[] = [
  {
    id: 'stage_classic',
    name: 'Classic Dojo',
    category: 'stage',
    rarity: 'common',
    price: 0, // Free/default
    floorColor: '#0a0a0a',
    gridColor: '#1a1a3a',
    accentColor: '#00d4ff',
    fogColor: '#000000',
    ambientLight: '#303030',
    spotlightColor: '#ffffff',
  },
  {
    id: 'stage_volcano',
    name: 'Volcanic Arena',
    category: 'stage',
    rarity: 'rare',
    price: 500,
    floorColor: '#1a0505',
    gridColor: '#3a1a1a',
    accentColor: '#ff4400',
    fogColor: '#1a0000',
    ambientLight: '#402020',
    spotlightColor: '#ff6644',
  },
  {
    id: 'stage_neon',
    name: 'Neon City',
    category: 'stage',
    rarity: 'rare',
    price: 750,
    floorColor: '#050510',
    gridColor: '#1a0a2a',
    accentColor: '#ff00ff',
    fogColor: '#0a0015',
    ambientLight: '#201030',
    spotlightColor: '#ff44ff',
  },
  {
    id: 'stage_arctic',
    name: 'Frozen Temple',
    category: 'stage',
    rarity: 'epic',
    price: 1500,
    floorColor: '#0a1520',
    gridColor: '#1a3050',
    accentColor: '#88ddff',
    fogColor: '#0a1525',
    ambientLight: '#304060',
    spotlightColor: '#aaeeff',
  },
  {
    id: 'stage_hell',
    name: 'Devil\'s Domain',
    category: 'stage',
    rarity: 'legendary',
    price: 3000,
    premiumPrice: 299,
    floorColor: '#150000',
    gridColor: '#400a0a',
    accentColor: '#ff0044',
    fogColor: '#200000',
    ambientLight: '#401010',
    spotlightColor: '#ff2244',
  },
  {
    id: 'stage_void',
    name: 'The Void',
    category: 'stage',
    rarity: 'legendary',
    price: 5000,
    premiumPrice: 499,
    floorColor: '#000000',
    gridColor: '#0a0a15',
    accentColor: '#7700ff',
    fogColor: '#000005',
    ambientLight: '#100020',
    spotlightColor: '#9944ff',
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
    secondaryColor: '#0088ff',
    particleColor: '#44eeff',
  },
  {
    id: 'electric_gold',
    name: 'Golden Thunder',
    category: 'electric_color',
    rarity: 'common',
    price: 0, // Free as it's the PEWGF color
    primaryColor: '#ffd700',
    secondaryColor: '#ff8c00',
    particleColor: '#ffee44',
  },
  {
    id: 'electric_red',
    name: 'Crimson Storm',
    category: 'electric_color',
    rarity: 'rare',
    price: 400,
    primaryColor: '#ff1744',
    secondaryColor: '#ff0055',
    particleColor: '#ff6688',
  },
  {
    id: 'electric_purple',
    name: 'Violet Surge',
    category: 'electric_color',
    rarity: 'rare',
    price: 400,
    primaryColor: '#9d4edd',
    secondaryColor: '#7b2cbf',
    particleColor: '#c77dff',
  },
  {
    id: 'electric_green',
    name: 'Toxic Shock',
    category: 'electric_color',
    rarity: 'epic',
    price: 1000,
    primaryColor: '#00ff88',
    secondaryColor: '#00cc66',
    particleColor: '#66ffaa',
  },
  {
    id: 'electric_pink',
    name: 'Sakura Lightning',
    category: 'electric_color',
    rarity: 'epic',
    price: 1200,
    primaryColor: '#ff66b2',
    secondaryColor: '#ff3399',
    particleColor: '#ff99cc',
  },
  {
    id: 'electric_rainbow',
    name: 'Prismatic Fury',
    category: 'electric_color',
    rarity: 'legendary',
    price: 4000,
    premiumPrice: 399,
    primaryColor: '#ff0000', // Cycles through colors
    secondaryColor: '#00ff00',
    particleColor: '#0000ff',
  },
  {
    id: 'electric_white',
    name: 'Pure Light',
    category: 'electric_color',
    rarity: 'legendary',
    price: 3500,
    premiumPrice: 349,
    primaryColor: '#ffffff',
    secondaryColor: '#eeeeff',
    particleColor: '#ffffff',
  },
]

// ============================================
// CHARACTERS
// ============================================
export const CHARACTERS: CharacterItem[] = [
  {
    id: 'char_mishima',
    name: 'Mishima Fighter',
    category: 'character',
    rarity: 'common',
    price: 0,
    skinColor: '#d4a574',
    clothColor: '#1a1a2e',
    hairColor: '#1a1a1a',
    hairStyle: 'spiky',
    modelPath: '/assets/models/characters/mishimaclassic.glb',
  },
  {
    id: 'char_demon',
    name: 'Devil Form',
    category: 'character',
    rarity: 'rare',
    price: 800,
    skinColor: '#6a4a6a',
    clothColor: '#2a0a2a',
    hairColor: '#440044',
    hairStyle: 'spiky',
    glowColor: '#ff0066',
    modelPath: '/assets/models/characters/devilform.glb',
  },
  {
    id: 'char_cyber',
    name: 'Cyber Warrior',
    category: 'character',
    rarity: 'epic',
    price: 1500,
    skinColor: '#2a4a6a',
    clothColor: '#0a2a4a',
    hairColor: '#00aaff',
    hairStyle: 'mohawk',
    glowColor: '#00d4ff',
    modelPath: '/assets/models/characters/cyberninja.glb',
  },
  {
    id: 'char_ghost',
    name: 'Phantom',
    category: 'character',
    rarity: 'epic',
    price: 2000,
    skinColor: '#aabbcc',
    clothColor: '#445566',
    hairColor: '#ddeeff',
    hairStyle: 'long',
    glowColor: '#88aacc',
    modelPath: '/assets/models/characters/shadowmaster.glb',
  },
  {
    id: 'char_inferno',
    name: 'Inferno',
    category: 'character',
    rarity: 'legendary',
    price: 4000,
    premiumPrice: 399,
    skinColor: '#ff6644',
    clothColor: '#441100',
    hairColor: '#ff2200',
    hairStyle: 'spiky',
    glowColor: '#ff4400',
    modelPath: '/assets/models/characters/goldendragon.glb',
  },
  {
    id: 'char_angel',
    name: 'Angel Form',
    category: 'character',
    rarity: 'legendary',
    price: 5000,
    premiumPrice: 499,
    skinColor: '#ffeedd',
    clothColor: '#eeeeff',
    hairColor: '#ffffff',
    hairStyle: 'long',
    glowColor: '#ffffaa',
    modelPath: '/assets/models/characters/icewarrior.glb',
  },
]

// ============================================
// DUMMIES (Opponents)
// ============================================
export const DUMMIES: DummyItem[] = [
  {
    id: 'dummy_classic',
    name: 'Training Partner',
    category: 'dummy',
    rarity: 'common',
    price: 0,
    skinColor: '#c9a078',
    clothColor: '#4a1515',
    style: 'classic',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
  {
    id: 'dummy_robot',
    name: 'Combat Mech',
    category: 'dummy',
    rarity: 'rare',
    price: 600,
    skinColor: '#667788',
    clothColor: '#334455',
    style: 'robot',
    modelPath: '/assets/models/dummies/combatrobot.glb',
  },
  {
    id: 'dummy_shadow',
    name: 'Shadow Clone',
    category: 'dummy',
    rarity: 'rare',
    price: 700,
    skinColor: '#1a1a2a',
    clothColor: '#0a0a15',
    style: 'shadow',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
  {
    id: 'dummy_holo',
    name: 'Hologram',
    category: 'dummy',
    rarity: 'epic',
    price: 1200,
    skinColor: '#00ffff',
    clothColor: '#0088aa',
    style: 'hologram',
    modelPath: '/assets/models/dummies/classicopponent.glb',
  },
  {
    id: 'dummy_practice',
    name: 'Wooden Dummy',
    category: 'dummy',
    rarity: 'epic',
    price: 1000,
    skinColor: '#aa7744',
    clothColor: '#664422',
    style: 'training_dummy',
    modelPath: '/assets/models/dummies/traingingdummy.glb',
  },
]

// ============================================
// LOOT CRATES
// ============================================
export const LOOT_CRATES: LootCrate[] = [
  {
    id: 'basic',
    name: 'Basic Crate',
    description: 'Contains 1 random item',
    price: 200,
    premiumPrice: 99, // $0.99
    itemCount: 1,
    rarityWeights: {
      common: 60,
      rare: 30,
      epic: 9,
      legendary: 1,
    },
  },
  {
    id: 'premium',
    name: 'Premium Crate',
    description: 'Contains 3 items with rare guarantee',
    price: 500,
    premiumPrice: 249, // $2.49
    itemCount: 3,
    guaranteedRarity: 'rare',
    rarityWeights: {
      common: 40,
      rare: 40,
      epic: 17,
      legendary: 3,
    },
  },
  {
    id: 'legendary',
    name: 'Legendary Crate',
    description: 'Contains 5 items with legendary guarantee!',
    price: 1500,
    premiumPrice: 499, // $4.99
    itemCount: 5,
    guaranteedRarity: 'epic',
    rarityWeights: {
      common: 20,
      rare: 35,
      epic: 35,
      legendary: 10,
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all items as a flat array
export function getAllItems(): ShopItem[] {
  return [...STAGES, ...ELECTRIC_COLORS, ...CHARACTERS, ...DUMMIES]
}

// Get item by ID
export function getItemById(id: string): ShopItem | undefined {
  return getAllItems().find(item => item.id === id)
}

// Get items by category
export function getItemsByCategory(category: string): ShopItem[] {
  return getAllItems().filter(item => item.category === category)
}

// Get items by rarity
export function getItemsByRarity(rarity: string): ShopItem[] {
  return getAllItems().filter(item => item.rarity === rarity)
}

// Get random item based on rarity weights
export function getRandomItem(weights: LootCrate['rarityWeights']): ShopItem {
  const allItems = getAllItems().filter(item => item.price > 0) // Exclude free items
  const rarityOrder: ('common' | 'rare' | 'epic' | 'legendary')[] = ['common', 'rare', 'epic', 'legendary']
  const totalWeight = weights.common + weights.rare + weights.epic + weights.legendary
  const random = Math.random() * totalWeight
  
  let rarity: 'common' | 'rare' | 'epic' | 'legendary'
  if (random < weights.common) {
    rarity = 'common'
  } else if (random < weights.common + weights.rare) {
    rarity = 'rare'
  } else if (random < weights.common + weights.rare + weights.epic) {
    rarity = 'epic'
  } else {
    rarity = 'legendary'
  }
  
  // Get items of this rarity, with fallback to higher rarities if none available
  let itemsOfRarity = allItems.filter(item => item.rarity === rarity)
  
  // If no items of this rarity, try upgrading to higher rarities
  if (itemsOfRarity.length === 0) {
    const currentRarityIndex = rarityOrder.indexOf(rarity)
    for (let r = currentRarityIndex + 1; r < rarityOrder.length; r++) {
      itemsOfRarity = allItems.filter(item => item.rarity === rarityOrder[r])
      if (itemsOfRarity.length > 0) break
    }
  }
  
  // If still no items, use any paid item
  if (itemsOfRarity.length === 0) {
    itemsOfRarity = allItems
  }
  
  return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)]
}

// Simulate opening a crate
export function openCrate(crate: LootCrate): ShopItem[] {
  const items: ShopItem[] = []
  const allItems = getAllItems().filter(item => item.price > 0) // Exclude free items
  const rarityOrder: ('common' | 'rare' | 'epic' | 'legendary')[] = ['common', 'rare', 'epic', 'legendary']
  
  for (let i = 0; i < crate.itemCount; i++) {
    // First item gets guaranteed rarity if applicable
    if (i === 0 && crate.guaranteedRarity) {
      let guaranteedItems = allItems.filter(item => {
        return rarityOrder.indexOf(item.rarity) >= rarityOrder.indexOf(crate.guaranteedRarity!)
      })
      
      // Fallback if no items meet the guaranteed rarity
      if (guaranteedItems.length === 0) {
        guaranteedItems = allItems
      }
      
      items.push(guaranteedItems[Math.floor(Math.random() * guaranteedItems.length)])
    } else {
      items.push(getRandomItem(crate.rarityWeights))
    }
  }
  
  return items
}

// Get default items (free items for new players)
export function getDefaultItems(): string[] {
  return [
    'stage_classic',
    'electric_blue',
    'electric_gold',
    'char_mishima',
    'dummy_classic',
  ]
}

// Calculate coins earned from a game session
export function calculateCoinsEarned(
  perfectCount: number,
  goodCount: number,
  maxStreak: number
): number {
  const perfectBonus = perfectCount * 5
  const goodBonus = goodCount * 2
  const streakBonus = Math.floor(maxStreak / 5) * 10
  return perfectBonus + goodBonus + streakBonus
}

// Rarity colors for UI
export const RARITY_COLORS = {
  common: '#9ca3af', // Gray
  rare: '#3b82f6', // Blue
  epic: '#a855f7', // Purple
  legendary: '#f59e0b', // Gold/Orange
}

export const RARITY_GLOW = {
  common: 'rgba(156, 163, 175, 0.3)',
  rare: 'rgba(59, 130, 246, 0.4)',
  epic: 'rgba(168, 85, 247, 0.5)',
  legendary: 'rgba(245, 158, 11, 0.6)',
}

