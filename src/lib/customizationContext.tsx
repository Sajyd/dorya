'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import {
  PlayerCurrency,
  PlayerInventory,
  ActiveCustomization,
  StageItem,
  ElectricColorItem,
  CharacterItem,
  DummyItem,
  ShopItem,
  CrateType,
} from '@/types/game'
import {
  STAGES,
  ELECTRIC_COLORS,
  CHARACTERS,
  DUMMIES,
  LOOT_CRATES,
  getItemById,
  rollCrateItems,
} from './customizationData'

interface ServerPlayerData {
  currency: {
    doryaCoins: number
    premiumCoins: number
  }
  inventory: {
    ownedItems: string[]
    selectedStage: string
    selectedElectricColor: string
    selectedCharacter: string
    selectedDummy: string
  }
}

// Extended ShopItem with isNew flag for crate opening results
export type CrateResultItem = ShopItem & { isNew: boolean }

interface CustomizationContextType {
  // Currency
  currency: PlayerCurrency
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  addPremiumCoins: (amount: number) => void
  spendPremiumCoins: (amount: number) => boolean
  
  // Inventory
  inventory: PlayerInventory
  ownsItem: (itemId: string) => boolean
  purchaseItem: (item: ShopItem) => boolean
  purchaseItemWithPremium: (item: ShopItem) => boolean
  
  // Selection
  selectStage: (id: string) => void
  selectElectricColor: (id: string) => void
  selectCharacter: (id: string) => void
  selectDummy: (id: string) => void
  
  // Active customization (resolved items for gameplay)
  activeCustomization: ActiveCustomization
  
  // Loot crates - returns items with isNew flag
  openCrate: (crateType: CrateType) => CrateResultItem[] | null
  openCrateWithPremium: (crateType: CrateType) => CrateResultItem[] | null
  
  // Server sync
  syncFromServer: (data: ServerPlayerData) => void
  getLocalData: () => { currency: PlayerCurrency; inventory: PlayerInventory }
  resetToDefaults: () => void
}

const CustomizationContext = createContext<CustomizationContextType | null>(null)

const STORAGE_KEY = 'dorya_customization'

interface StoredData {
  currency: PlayerCurrency
  inventory: PlayerInventory
}

function getDefaultInventory(): PlayerInventory {
  return {
    ownedItems: ['stage_classic', 'electric_blue', 'char_mishima', 'dummy_classic'],
    selectedStage: 'stage_classic',
    selectedElectricColor: 'electric_blue',
    selectedCharacter: 'char_mishima',
    selectedDummy: 'dummy_classic',
  }
}

function getDefaultCurrency(): PlayerCurrency {
  return {
    doryaCoins: 100, // Starting bonus
    premiumCoins: 0,
  }
}

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<PlayerCurrency>(getDefaultCurrency())
  const [inventory, setInventory] = useState<PlayerInventory>(getDefaultInventory())
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const data: StoredData = JSON.parse(stored)
          setCurrency(data.currency)
          setInventory(data.inventory)
        } catch (e) {
          console.error('Failed to load customization data:', e)
        }
      }
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      const data: StoredData = { currency, inventory }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [currency, inventory, isLoaded])

  // Currency functions
  const addCoins = useCallback((amount: number) => {
    setCurrency(prev => ({ ...prev, doryaCoins: prev.doryaCoins + amount }))
  }, [])

  const spendCoins = useCallback((amount: number): boolean => {
    if (currency.doryaCoins < amount) return false
    setCurrency(prev => ({ 
      ...prev, 
      doryaCoins: Math.max(0, prev.doryaCoins - amount) 
    }))
    return true
  }, [currency.doryaCoins])

  const addPremiumCoins = useCallback((amount: number) => {
    setCurrency(prev => ({ ...prev, premiumCoins: prev.premiumCoins + amount }))
  }, [])

  const spendPremiumCoins = useCallback((amount: number): boolean => {
    if (currency.premiumCoins < amount) return false
    setCurrency(prev => ({ 
      ...prev, 
      premiumCoins: Math.max(0, prev.premiumCoins - amount) 
    }))
    return true
  }, [currency.premiumCoins])

  // Inventory functions
  const ownsItem = useCallback((itemId: string): boolean => {
    return inventory.ownedItems.includes(itemId)
  }, [inventory.ownedItems])

  const purchaseItem = useCallback((item: ShopItem): boolean => {
    if (ownsItem(item.id)) return false
    if (!spendCoins(item.price)) return false
    
    setInventory(prev => ({
      ...prev,
      ownedItems: [...prev.ownedItems, item.id],
    }))
    return true
  }, [ownsItem, spendCoins])

  const purchaseItemWithPremium = useCallback((item: ShopItem): boolean => {
    if (ownsItem(item.id)) return false
    if (!item.premiumPrice) return false
    if (!spendPremiumCoins(item.premiumPrice)) return false
    
    setInventory(prev => ({
      ...prev,
      ownedItems: [...prev.ownedItems, item.id],
    }))
    return true
  }, [ownsItem, spendPremiumCoins])

  // Selection functions
  const selectStage = useCallback((id: string) => {
    if (ownsItem(id)) {
      setInventory(prev => ({ ...prev, selectedStage: id }))
    }
  }, [ownsItem])

  const selectElectricColor = useCallback((id: string) => {
    if (ownsItem(id)) {
      setInventory(prev => ({ ...prev, selectedElectricColor: id }))
    }
  }, [ownsItem])

  const selectCharacter = useCallback((id: string) => {
    if (ownsItem(id)) {
      setInventory(prev => ({ ...prev, selectedCharacter: id }))
    }
  }, [ownsItem])

  const selectDummy = useCallback((id: string) => {
    if (ownsItem(id)) {
      setInventory(prev => ({ ...prev, selectedDummy: id }))
    }
  }, [ownsItem])

  // Get active customization
  const activeCustomization: ActiveCustomization = {
    stage: STAGES.find(s => s.id === inventory.selectedStage) || STAGES[0],
    electricColor: ELECTRIC_COLORS.find(e => e.id === inventory.selectedElectricColor) || ELECTRIC_COLORS[0],
    character: CHARACTERS.find(c => c.id === inventory.selectedCharacter) || CHARACTERS[0],
    dummy: DUMMIES.find(d => d.id === inventory.selectedDummy) || DUMMIES[0],
  }

  // Loot crate functions
  const openCrate = useCallback((crateType: CrateType): CrateResultItem[] | null => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) return null
    if (!spendCoins(crate.price)) return null

    const items = rollCrateItems(crate)
    
    // Mark items as new or duplicate
    const resultItems: CrateResultItem[] = items.map(item => ({
      ...item,
      isNew: !inventory.ownedItems.includes(item.id),
    }))
    
    // Add new items to inventory
    const newItems = resultItems.filter(item => item.isNew)
    if (newItems.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: [...prev.ownedItems, ...newItems.map(i => i.id)],
      }))
    }
    
    // Give coins for duplicates (10% of item value)
    const duplicates = resultItems.filter(item => !item.isNew)
    const refundCoins = duplicates.reduce((sum, item) => sum + Math.floor(item.price * 0.1), 0)
    if (refundCoins > 0) {
      addCoins(refundCoins)
    }

    return resultItems
  }, [spendCoins, inventory.ownedItems, addCoins])

  const openCrateWithPremium = useCallback((crateType: CrateType): CrateResultItem[] | null => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) return null
    if (!spendPremiumCoins(crate.premiumPrice)) return null

    const items = rollCrateItems(crate)
    
    // Mark items as new or duplicate
    const resultItems: CrateResultItem[] = items.map(item => ({
      ...item,
      isNew: !inventory.ownedItems.includes(item.id),
    }))
    
    // Add new items to inventory
    const newItems = resultItems.filter(item => item.isNew)
    if (newItems.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: [...prev.ownedItems, ...newItems.map(i => i.id)],
      }))
    }
    
    // Give coins for duplicates
    const duplicates = resultItems.filter(item => !item.isNew)
    const refundCoins = duplicates.reduce((sum, item) => sum + Math.floor(item.price * 0.1), 0)
    if (refundCoins > 0) {
      addCoins(refundCoins)
    }

    return resultItems
  }, [spendPremiumCoins, inventory.ownedItems, addCoins])

  // Sync from server data (used after login/signup)
  const syncFromServer = useCallback((data: ServerPlayerData) => {
    // Override local state with server data
    setCurrency({
      doryaCoins: Math.max(0, data.currency.doryaCoins),
      premiumCoins: Math.max(0, data.currency.premiumCoins),
    })
    setInventory({
      ownedItems: data.inventory.ownedItems,
      selectedStage: data.inventory.selectedStage,
      selectedElectricColor: data.inventory.selectedElectricColor,
      selectedCharacter: data.inventory.selectedCharacter,
      selectedDummy: data.inventory.selectedDummy,
    })
  }, [])

  // Get local data (used when signing up to transfer to server)
  const getLocalData = useCallback(() => {
    return { currency, inventory }
  }, [currency, inventory])

  // Reset to defaults (used on logout)
  const resetToDefaults = useCallback(() => {
    setCurrency(getDefaultCurrency())
    setInventory(getDefaultInventory())
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <CustomizationContext.Provider
      value={{
        currency,
        addCoins,
        spendCoins,
        addPremiumCoins,
        spendPremiumCoins,
        inventory,
        ownsItem,
        purchaseItem,
        purchaseItemWithPremium,
        selectStage,
        selectElectricColor,
        selectCharacter,
        selectDummy,
        activeCustomization,
        openCrate,
        openCrateWithPremium,
        syncFromServer,
        getLocalData,
        resetToDefaults,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  )
}

export function useCustomization() {
  const context = useContext(CustomizationContext)
  if (!context) {
    throw new Error('useCustomization must be used within CustomizationProvider')
  }
  return context
}

