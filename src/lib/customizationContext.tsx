'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import {
  PlayerCurrency,
  PlayerInventory,
  ActiveCustomization,
  ShopItem,
  CrateType,
} from '@/types/game'
import {
  STAGES,
  ELECTRIC_COLORS,
  CHARACTERS,
  DUMMIES,
  LOOT_CRATES,
  rollCrateItems,
} from './customizationData'
import { useUser } from '@/context/UserContext'

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
  addCoins: (amount: number) => Promise<void>
  spendCoins: (amount: number) => Promise<boolean>
  addPremiumCoins: (amount: number) => Promise<void>
  spendPremiumCoins: (amount: number) => Promise<boolean>
  
  // Inventory
  inventory: PlayerInventory
  ownsItem: (itemId: string) => boolean
  purchaseItem: (item: ShopItem) => Promise<boolean>
  purchaseItemWithPremium: (item: ShopItem) => Promise<boolean>
  addItemsToInventory: (itemIds: string[], refundCoins?: number) => void
  
  // Selection
  selectStage: (id: string) => Promise<void>
  selectElectricColor: (id: string) => Promise<void>
  selectCharacter: (id: string) => Promise<void>
  selectDummy: (id: string) => Promise<void>
  
  // Active customization (resolved items for gameplay)
  activeCustomization: ActiveCustomization
  
  // Loot crates - returns items with isNew flag
  openCrate: (crateType: CrateType) => Promise<CrateResultItem[] | null>
  openCrateWithPremium: (crateType: CrateType) => Promise<CrateResultItem[] | null>
  
  // Server sync
  syncFromServer: (data: ServerPlayerData) => void
  getLocalData: () => { currency: PlayerCurrency; inventory: PlayerInventory }
  resetToDefaults: () => void
  
  // Loading state
  isLoading: boolean
}

const CustomizationContext = createContext<CustomizationContextType | null>(null)

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
    doryaCoins: 500,
    premiumCoins: 0,
  }
}

// Debounce helper for syncing to server
function useDebouncedSync() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const sync = useCallback(async (data: Record<string, unknown>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/player/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        })
      } catch (e) {
        console.error('Failed to sync to server:', e)
      }
    }, 300)
  }, [])
  
  return sync
}

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<PlayerCurrency>(getDefaultCurrency())
  const [inventory, setInventory] = useState<PlayerInventory>(getDefaultInventory())
  const [isLoading, setIsLoading] = useState(true)
  const { pendingPlayerData, clearPendingPlayerData } = useUser()
  const debouncedSync = useDebouncedSync()

  // Sync from server when user logs in or initializes
  useEffect(() => {
    if (pendingPlayerData) {
      setCurrency({
        doryaCoins: Math.max(0, pendingPlayerData.currency.doryaCoins),
        premiumCoins: Math.max(0, pendingPlayerData.currency.premiumCoins),
      })
      setInventory({
        ownedItems: pendingPlayerData.inventory.ownedItems,
        selectedStage: pendingPlayerData.inventory.selectedStage,
        selectedElectricColor: pendingPlayerData.inventory.selectedElectricColor,
        selectedCharacter: pendingPlayerData.inventory.selectedCharacter,
        selectedDummy: pendingPlayerData.inventory.selectedDummy,
      })
      clearPendingPlayerData()
      setIsLoading(false)
    }
  }, [pendingPlayerData, clearPendingPlayerData])

  // Currency functions
  const addCoins = useCallback(async (amount: number) => {
    setCurrency(prev => ({ ...prev, doryaCoins: prev.doryaCoins + amount }))
    await debouncedSync({ addCoins: amount })
  }, [debouncedSync])

  const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (currency.doryaCoins < amount) return false
    
    const newAmount = Math.max(0, currency.doryaCoins - amount)
    setCurrency(prev => ({ ...prev, doryaCoins: newAmount }))
    
    // Sync absolute value to prevent race conditions
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currency: { doryaCoins: newAmount } }),
      })
    } catch (e) {
      console.error('Failed to sync coin spend:', e)
    }
    
    return true
  }, [currency.doryaCoins])

  const addPremiumCoins = useCallback(async (amount: number) => {
    setCurrency(prev => ({ ...prev, premiumCoins: prev.premiumCoins + amount }))
    await debouncedSync({ addPremiumCoins: amount })
  }, [debouncedSync])

  const spendPremiumCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (currency.premiumCoins < amount) return false
    
    const newAmount = Math.max(0, currency.premiumCoins - amount)
    setCurrency(prev => ({ ...prev, premiumCoins: newAmount }))
    
    // Sync absolute value to prevent race conditions
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currency: { premiumCoins: newAmount } }),
      })
    } catch (e) {
      console.error('Failed to sync premium coin spend:', e)
    }
    
    return true
  }, [currency.premiumCoins])

  // Inventory functions
  const ownsItem = useCallback((itemId: string): boolean => {
    return inventory.ownedItems.includes(itemId)
  }, [inventory.ownedItems])

  const purchaseItem = useCallback(async (item: ShopItem): Promise<boolean> => {
    if (ownsItem(item.id)) return false
    if (currency.doryaCoins < item.price) return false
    
    const newCoins = Math.max(0, currency.doryaCoins - item.price)
    const newOwnedItems = [...inventory.ownedItems, item.id]
    
    setCurrency(prev => ({ ...prev, doryaCoins: newCoins }))
    setInventory(prev => ({ ...prev, ownedItems: newOwnedItems }))
    
    // Sync to server
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          currency: { doryaCoins: newCoins },
          addOwnedItems: [item.id],
        }),
      })
    } catch (e) {
      console.error('Failed to sync purchase:', e)
    }
    
    return true
  }, [ownsItem, currency.doryaCoins, inventory.ownedItems])

  const purchaseItemWithPremium = useCallback(async (item: ShopItem): Promise<boolean> => {
    if (ownsItem(item.id)) return false
    if (!item.premiumPrice) return false
    if (currency.premiumCoins < item.premiumPrice) return false
    
    const newPremiumCoins = Math.max(0, currency.premiumCoins - item.premiumPrice)
    const newOwnedItems = [...inventory.ownedItems, item.id]
    
    setCurrency(prev => ({ ...prev, premiumCoins: newPremiumCoins }))
    setInventory(prev => ({ ...prev, ownedItems: newOwnedItems }))
    
    // Sync to server
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          currency: { premiumCoins: newPremiumCoins },
          addOwnedItems: [item.id],
        }),
      })
    } catch (e) {
      console.error('Failed to sync premium purchase:', e)
    }
    
    return true
  }, [ownsItem, currency.premiumCoins, inventory.ownedItems])

  // Add items to inventory (used after opening Stripe crates - server already updated)
  const addItemsToInventory = useCallback((itemIds: string[], refundCoins: number = 0) => {
    // Filter out items already owned
    const newItems = itemIds.filter(id => !inventory.ownedItems.includes(id))
    
    if (newItems.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: [...prev.ownedItems, ...newItems],
      }))
    }
    
    // Add refund coins for duplicates
    if (refundCoins > 0) {
      setCurrency(prev => ({ ...prev, doryaCoins: prev.doryaCoins + refundCoins }))
    }
  }, [inventory.ownedItems])

  // Selection functions
  const selectStage = useCallback(async (id: string) => {
    if (!ownsItem(id)) return
    setInventory(prev => ({ ...prev, selectedStage: id }))
    await debouncedSync({ setSelection: { type: 'stage', itemId: id } })
  }, [ownsItem, debouncedSync])

  const selectElectricColor = useCallback(async (id: string) => {
    if (!ownsItem(id)) return
    setInventory(prev => ({ ...prev, selectedElectricColor: id }))
    await debouncedSync({ setSelection: { type: 'electric_color', itemId: id } })
  }, [ownsItem, debouncedSync])

  const selectCharacter = useCallback(async (id: string) => {
    if (!ownsItem(id)) return
    setInventory(prev => ({ ...prev, selectedCharacter: id }))
    await debouncedSync({ setSelection: { type: 'character', itemId: id } })
  }, [ownsItem, debouncedSync])

  const selectDummy = useCallback(async (id: string) => {
    if (!ownsItem(id)) return
    setInventory(prev => ({ ...prev, selectedDummy: id }))
    await debouncedSync({ setSelection: { type: 'dummy', itemId: id } })
  }, [ownsItem, debouncedSync])

  // Get active customization
  const activeCustomization: ActiveCustomization = {
    stage: STAGES.find(s => s.id === inventory.selectedStage) || STAGES[0],
    electricColor: ELECTRIC_COLORS.find(e => e.id === inventory.selectedElectricColor) || ELECTRIC_COLORS[0],
    character: CHARACTERS.find(c => c.id === inventory.selectedCharacter) || CHARACTERS[0],
    dummy: DUMMIES.find(d => d.id === inventory.selectedDummy) || DUMMIES[0],
  }

  // Loot crate functions
  const openCrate = useCallback(async (crateType: CrateType): Promise<CrateResultItem[] | null> => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) return null
    if (currency.doryaCoins < crate.price) return null

    const newCoins = Math.max(0, currency.doryaCoins - crate.price)
    setCurrency(prev => ({ ...prev, doryaCoins: newCoins }))

    const items = rollCrateItems(crate)
    
    // Mark items as new or duplicate
    const resultItems: CrateResultItem[] = items.map(item => ({
      ...item,
      isNew: !inventory.ownedItems.includes(item.id),
    }))
    
    // Add new items to inventory
    const newItems = resultItems.filter(item => item.isNew)
    const newOwnedItems = [...inventory.ownedItems, ...newItems.map(i => i.id)]
    
    if (newItems.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: newOwnedItems,
      }))
    }
    
    // Give coins for duplicates (10% of item value)
    const duplicates = resultItems.filter(item => !item.isNew)
    const refundCoins = duplicates.reduce((sum, item) => sum + Math.floor(item.price * 0.1), 0)
    
    const finalCoins = newCoins + refundCoins
    if (refundCoins > 0) {
      setCurrency(prev => ({ ...prev, doryaCoins: finalCoins }))
    }

    // Sync to server
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          currency: { doryaCoins: finalCoins },
          addOwnedItems: newItems.map(i => i.id),
        }),
      })
    } catch (e) {
      console.error('Failed to sync crate open:', e)
    }

    return resultItems
  }, [currency.doryaCoins, inventory.ownedItems])

  const openCrateWithPremium = useCallback(async (crateType: CrateType): Promise<CrateResultItem[] | null> => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate) return null
    if (currency.premiumCoins < crate.premiumPrice) return null

    const newPremiumCoins = Math.max(0, currency.premiumCoins - crate.premiumPrice)
    setCurrency(prev => ({ ...prev, premiumCoins: newPremiumCoins }))

    const items = rollCrateItems(crate)
    
    // Mark items as new or duplicate
    const resultItems: CrateResultItem[] = items.map(item => ({
      ...item,
      isNew: !inventory.ownedItems.includes(item.id),
    }))
    
    // Add new items to inventory
    const newItems = resultItems.filter(item => item.isNew)
    const newOwnedItems = [...inventory.ownedItems, ...newItems.map(i => i.id)]
    
    if (newItems.length > 0) {
      setInventory(prev => ({
        ...prev,
        ownedItems: newOwnedItems,
      }))
    }
    
    // Give coins for duplicates
    const duplicates = resultItems.filter(item => !item.isNew)
    const refundCoins = duplicates.reduce((sum, item) => sum + Math.floor(item.price * 0.1), 0)
    
    let newDoryaCoins = currency.doryaCoins
    if (refundCoins > 0) {
      newDoryaCoins = currency.doryaCoins + refundCoins
      setCurrency(prev => ({ ...prev, doryaCoins: newDoryaCoins }))
    }

    // Sync to server
    try {
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          currency: { premiumCoins: newPremiumCoins, doryaCoins: newDoryaCoins },
          addOwnedItems: newItems.map(i => i.id),
        }),
      })
    } catch (e) {
      console.error('Failed to sync premium crate open:', e)
    }

    return resultItems
  }, [currency.premiumCoins, currency.doryaCoins, inventory.ownedItems])

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
        addItemsToInventory,
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
        isLoading,
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
