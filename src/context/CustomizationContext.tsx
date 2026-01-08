'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  PlayerCurrency,
  PlayerInventory,
  StageItem,
  ElectricColorItem,
  CharacterItem,
  DummyItem,
  ShopItem,
  ActiveCustomization,
  CrateType,
} from '@/types/game'
import {
  STAGES,
  ELECTRIC_COLORS,
  CHARACTERS,
  DUMMIES,
  LOOT_CRATES,
  getDefaultItems,
  getItemById,
  openCrate,
} from '@/lib/customization-data'

interface CustomizationContextType {
  // Currency
  currency: PlayerCurrency
  addCoins: (amount: number) => void
  addPremiumCoins: (amount: number) => void
  
  // Inventory
  inventory: PlayerInventory
  ownedItems: Set<string>
  
  // Selected customizations (fully resolved items)
  activeCustomization: ActiveCustomization
  
  // Actions
  purchaseItem: (item: ShopItem, usePremium?: boolean) => boolean
  selectItem: (itemId: string) => void
  openLootCrate: (crateType: CrateType, usePremium?: boolean) => ShopItem[] | null
  
  // UI State
  isLoading: boolean
}

const defaultCurrency: PlayerCurrency = {
  doryaCoins: 500, // Start with some coins to try things out
  premiumCoins: 0,
}

const defaultInventory: PlayerInventory = {
  ownedItems: getDefaultItems(),
  selectedStage: 'stage_classic',
  selectedElectricColor: 'electric_blue',
  selectedCharacter: 'char_mishima',
  selectedDummy: 'dummy_classic',
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined)

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<PlayerCurrency>(defaultCurrency)
  const [inventory, setInventory] = useState<PlayerInventory>(defaultInventory)
  const [isLoading, setIsLoading] = useState(false)
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('dorya_currency')
    const savedInventory = localStorage.getItem('dorya_inventory')
    
    if (savedCurrency) {
      try {
        setCurrency(JSON.parse(savedCurrency))
      } catch (e) {
        console.error('Failed to parse saved currency', e)
      }
    }
    
    if (savedInventory) {
      try {
        setInventory(JSON.parse(savedInventory))
      } catch (e) {
        console.error('Failed to parse saved inventory', e)
      }
    }
  }, [])
  
  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem('dorya_currency', JSON.stringify(currency))
  }, [currency])
  
  useEffect(() => {
    localStorage.setItem('dorya_inventory', JSON.stringify(inventory))
  }, [inventory])
  
  // Derive owned items set for fast lookup
  const ownedItems = new Set(inventory.ownedItems)
  
  // Resolve active customization to full items
  const activeCustomization: ActiveCustomization = {
    stage: STAGES.find(s => s.id === inventory.selectedStage) || STAGES[0],
    electricColor: ELECTRIC_COLORS.find(e => e.id === inventory.selectedElectricColor) || ELECTRIC_COLORS[0],
    character: CHARACTERS.find(c => c.id === inventory.selectedCharacter) || CHARACTERS[0],
    dummy: DUMMIES.find(d => d.id === inventory.selectedDummy) || DUMMIES[0],
  }
  
  const addCoins = useCallback((amount: number) => {
    setCurrency(prev => ({
      ...prev,
      doryaCoins: prev.doryaCoins + amount,
    }))
  }, [])
  
  const addPremiumCoins = useCallback((amount: number) => {
    setCurrency(prev => ({
      ...prev,
      premiumCoins: prev.premiumCoins + amount,
    }))
  }, [])
  
  const purchaseItem = useCallback((item: ShopItem, usePremium = false): boolean => {
    // Check if already owned
    if (ownedItems.has(item.id)) {
      return false
    }
    
    if (usePremium && item.premiumPrice) {
      // Purchase with premium currency
      if (currency.premiumCoins < item.premiumPrice) {
        return false
      }
      
      setCurrency(prev => ({
        ...prev,
        premiumCoins: prev.premiumCoins - item.premiumPrice!,
      }))
    } else {
      // Purchase with dorya coins
      if (currency.doryaCoins < item.price) {
        return false
      }
      
      setCurrency(prev => ({
        ...prev,
        doryaCoins: prev.doryaCoins - item.price,
      }))
    }
    
    // Add to inventory
    setInventory(prev => ({
      ...prev,
      ownedItems: [...prev.ownedItems, item.id],
    }))
    
    return true
  }, [currency, ownedItems])
  
  const selectItem = useCallback((itemId: string) => {
    const item = getItemById(itemId)
    if (!item || !ownedItems.has(itemId)) return
    
    setInventory(prev => {
      switch (item.category) {
        case 'stage':
          return { ...prev, selectedStage: itemId }
        case 'electric_color':
          return { ...prev, selectedElectricColor: itemId }
        case 'character':
          return { ...prev, selectedCharacter: itemId }
        case 'dummy':
          return { ...prev, selectedDummy: itemId }
        default:
          return prev
      }
    })
  }, [ownedItems])
  
  const openLootCrate = useCallback((crateType: CrateType, usePremium = false): ShopItem[] | null => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) return null
    
    // Check if can afford
    if (usePremium) {
      if (currency.premiumCoins < crate.premiumPrice) {
        return null
      }
      setCurrency(prev => ({
        ...prev,
        premiumCoins: prev.premiumCoins - crate.premiumPrice,
      }))
    } else {
      if (currency.doryaCoins < crate.price) {
        return null
      }
      setCurrency(prev => ({
        ...prev,
        doryaCoins: prev.doryaCoins - crate.price,
      }))
    }
    
    // Open crate and get items
    const items = openCrate(crate)
    
    // Add new items to inventory (skip duplicates, give coin refund)
    const newItemIds: string[] = []
    let refundCoins = 0
    
    items.forEach(item => {
      if (ownedItems.has(item.id)) {
        // Duplicate - refund some coins based on rarity
        const refundAmounts = { common: 20, rare: 50, epic: 100, legendary: 200 }
        refundCoins += refundAmounts[item.rarity]
      } else {
        newItemIds.push(item.id)
      }
    })
    
    if (newItemIds.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: [...prev.ownedItems, ...newItemIds],
      }))
    }
    
    if (refundCoins > 0) {
      setCurrency(prev => ({
        ...prev,
        doryaCoins: prev.doryaCoins + refundCoins,
      }))
    }
    
    return items
  }, [currency, ownedItems])
  
  const value: CustomizationContextType = {
    currency,
    addCoins,
    addPremiumCoins,
    inventory,
    ownedItems,
    activeCustomization,
    purchaseItem,
    selectItem,
    openLootCrate,
    isLoading,
  }
  
  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  )
}

export function useCustomization() {
  const context = useContext(CustomizationContext)
  if (context === undefined) {
    throw new Error('useCustomization must be used within a CustomizationProvider')
  }
  return context
}

