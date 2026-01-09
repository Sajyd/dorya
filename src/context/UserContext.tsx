'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

export interface User {
  id: string
  username: string
  isGuest: boolean
  createdAt: string
}

interface PlayerData {
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
    keybindings?: {
      forward: string
      down: string
      punch: string
    }
  }
}

interface AuthResult {
  success: boolean
  error?: string
  playerData?: PlayerData
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  isLoggedIn: boolean
  pendingPlayerData: PlayerData | null
  clearPendingPlayerData: () => void
  
  // Guest functions
  updateGuestUsername: (newUsername: string) => Promise<boolean>
  
  // Auth functions
  login: (username: string, password: string) => Promise<AuthResult>
  signup: (username: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingPlayerData, setPendingPlayerData] = useState<PlayerData | null>(null)
  
  const clearPendingPlayerData = useCallback(() => {
    setPendingPlayerData(null)
  }, [])

  // Initialize user on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeUser()
    }
  }, [])

  const initializeUser = async () => {
    try {
      // Call the init endpoint - it will check cookies and return user data
      const response = await fetch('/api/player/init', {
        method: 'GET',
        credentials: 'include', // Include cookies
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser({
          id: data.user.id,
          username: data.user.username,
          isGuest: data.isGuest,
          createdAt: data.user.createdAt,
        })
        
        if (data.playerData) {
          setPendingPlayerData(data.playerData)
        }
      } else {
        console.error('Failed to initialize user')
      }
    } catch (e) {
      console.error('User initialization failed:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Update username for guest users
  const updateGuestUsername = useCallback(async (newUsername: string): Promise<boolean> => {
    if (!user || !user.isGuest) return false
    
    const cleanUsername = newUsername.trim().toUpperCase().slice(0, 20)
    if (cleanUsername.length < 3) return false
    
    // Check for invalid characters
    if (!/^[A-Z0-9_]+$/.test(cleanUsername)) return false
    
    try {
      const response = await fetch('/api/player/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUsername }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(prev => prev ? {
          ...prev,
          username: data.user.username,
        } : null)
        return true
      }
      
      return false
    } catch (e) {
      console.error('Failed to update username:', e)
      return false
    }
  }, [user])

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username.trim().toUpperCase(), 
          password 
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      // Set user
      setUser({
        id: data.user.id,
        username: data.user.username,
        isGuest: false,
        createdAt: data.user.createdAt,
      })
      
      // Store pending player data for sync
      if (data.playerData) {
        setPendingPlayerData(data.playerData)
      }
      
      return { success: true, playerData: data.playerData }
    } catch (e) {
      console.error('Login error:', e)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  // Signup function
  const signup = useCallback(async (
    username: string, 
    password: string,
  ): Promise<AuthResult> => {
    try {
      const cleanUsername = username.trim().toUpperCase()
      
      // Validate username
      if (cleanUsername.length < 3 || cleanUsername.length > 20) {
        return { success: false, error: 'Username must be 3-20 characters' }
      }
      if (!/^[A-Z0-9_]+$/.test(cleanUsername)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' }
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: cleanUsername, 
          password,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Signup failed' }
      }

      // Set user
      setUser({
        id: data.user.id,
        username: data.user.username,
        isGuest: false,
        createdAt: data.user.createdAt,
      })
      
      // Store pending player data for sync
      if (data.playerData) {
        setPendingPlayerData(data.playerData)
      }
      
      return { success: true, playerData: data.playerData }
    } catch (e) {
      console.error('Signup error:', e)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Set user to new guest
        setUser({
          id: data.user.id,
          username: data.user.username,
          isGuest: true,
          createdAt: data.user.createdAt,
        })
        
        // Set pending player data for the new guest
        if (data.playerData) {
          setPendingPlayerData(data.playerData)
        }
      }
    } catch (e) {
      console.error('Logout error:', e)
    }
  }, [])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!(user && !user.isGuest),
        pendingPlayerData,
        clearPendingPlayerData,
        updateGuestUsername,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
