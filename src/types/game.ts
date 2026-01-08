// Game mode types matching Prisma schema
export type GameMode = 'DORYA_STREAK' | 'PEWGF_MINUTE' | 'SURVIVAL' | 'FREESTYLE'

// Input types for the command system
export type InputDirection = 'f' | 'd' | 'df' | 'n' // forward, down, down-forward, neutral
export type InputButton = '2' | 'none' // Right punch in Tekken notation

export interface CommandInput {
  direction: InputDirection
  button: InputButton
  timestamp: number
  frame: number
}

// ============================================
// CUSTOMIZATION SYSTEM
// ============================================

// Rarity tiers for items
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

// Item categories
export type ItemCategory = 'stage' | 'electric_color' | 'character' | 'dummy'

// Base interface for all customization items
export interface CustomizationItem {
  id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  preview?: string // Preview image URL
  price: number // Price in Dorya Coins
  premiumPrice?: number // Optional real money price in cents
}

// Stage customization
export interface StageItem extends CustomizationItem {
  category: 'stage'
  floorColor: string
  gridColor: string
  accentColor: string
  fogColor: string
  ambientLight: string
  spotlightColor: string
}

// Electric effect color
export interface ElectricColorItem extends CustomizationItem {
  category: 'electric_color'
  primaryColor: string // Main electric color
  secondaryColor: string // Glow/accent color
  particleColor: string // Particle effects
}

// Character model
export interface CharacterItem extends CustomizationItem {
  category: 'character'
  skinColor: string
  clothColor: string
  hairColor: string
  hairStyle: 'spiky' | 'slicked' | 'mohawk' | 'bald' | 'long'
  glowColor?: string // Optional character glow
  modelPath: string // Path to GLB model file
}

// Dummy (opponent) model
export interface DummyItem extends CustomizationItem {
  category: 'dummy'
  skinColor: string
  clothColor: string
  style: 'training_dummy' | 'robot' | 'shadow' | 'hologram' | 'classic'
  modelPath: string // Path to GLB model file
}

// Union type for all items
export type ShopItem = StageItem | ElectricColorItem | CharacterItem | DummyItem

// Loot crate types
export type CrateType = 'basic' | 'premium' | 'legendary'

export interface LootCrate {
  id: CrateType
  name: string
  description: string
  price: number // In Dorya Coins
  premiumPrice: number // In cents (real money)
  itemCount: number // How many items per crate
  guaranteedRarity?: ItemRarity // Minimum rarity guarantee
  rarityWeights: {
    common: number
    rare: number
    epic: number
    legendary: number
  }
}

// Player's currency
export interface PlayerCurrency {
  doryaCoins: number // Earned through gameplay
  premiumCoins: number // Purchased with real money
}

// Player's inventory
export interface PlayerInventory {
  ownedItems: string[] // Array of item IDs
  selectedStage: string
  selectedElectricColor: string
  selectedCharacter: string
  selectedDummy: string
}

// Active customization state for gameplay
export interface ActiveCustomization {
  stage: StageItem
  electricColor: ElectricColorItem
  character: CharacterItem
  dummy: DummyItem
}

// EWGF requires: f, n, d, df+2 (with 1-frame precision for PEWGF)
export interface DoryaAttempt {
  inputs: CommandInput[]
  result: 'perfect' | 'good' | 'bad' | 'miss'
  timing: number // Frame timing from d to df+2
  timestamp: number
  validMotion?: boolean // True if inputs matched WGF motion (f → n → d → df+2) even on miss
}

// Game state
export interface GameState {
  mode: GameMode
  isPlaying: boolean
  isPaused: boolean
  
  // Scores
  currentStreak: number
  maxStreak: number
  totalDoryas: number
  perfectCount: number
  goodCount: number
  missCount: number
  
  // Timer (for timed modes)
  timeRemaining: number // seconds
  elapsedTime: number
  
  // Current attempt tracking
  currentInputs: CommandInput[]
  lastAttempt: DoryaAttempt | null
  
  // History
  attemptHistory: DoryaAttempt[]
}

// Character types
export interface Character {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  isAttacking: boolean
  isHit: boolean
  currentAnimation: 'idle' | 'ewgf' | 'hit_react' | 'fall'
}

// Hitbox
export interface Hitbox {
  position: [number, number, number]
  size: [number, number, number]
  active: boolean
}

// Player profile
export interface PlayerProfile {
  id: string
  username: string
  totalDoryas: number
  totalPewgfs: number
  totalGamesPlayed: number
}

// Ladder entry
export interface LadderEntry {
  id: string
  rank: number
  username: string
  score: number
  mode: GameMode
  createdAt: string
}

// Game session result
export interface GameResult {
  mode: GameMode
  score: number
  perfectInputs: number
  goodInputs: number
  missedInputs: number
  maxCombo: number
  duration: number
  commandHistory: DoryaAttempt[]
}

