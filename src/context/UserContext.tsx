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
  updateGuestUsername: (newUsername: string) => boolean
  
  // Auth functions
  login: (username: string, password: string) => Promise<AuthResult>
  signup: (username: string, password: string, localData?: { currency: { doryaCoins: number; premiumCoins: number }; inventory: { ownedItems: string[]; selectedStage: string; selectedElectricColor: string; selectedCharacter: string; selectedDummy: string } }) => Promise<AuthResult>
  logout: () => void
}

const UserContext = createContext<UserContextType | null>(null)

const USER_STORAGE_KEY = 'dorya_user'
const AUTH_STORAGE_KEY = 'dorya_auth'

function generateGuestUsername(): string {
  const randomNum = Math.floor(Math.random() * 9000000000) + 1000000000
  return `DORYA_${randomNum}`
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authToken, setAuthToken] = useState<string | null>(null)
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
    // Check for stored auth token first
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth)
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser({
            id: userData.id,
            username: userData.username,
            isGuest: false,
            createdAt: userData.createdAt,
          })
          setAuthToken(authData.token)
          // Store player data to be synced by customization context
          if (userData.playerData) {
            setPendingPlayerData(userData.playerData)
          }
          setIsLoading(false)
          return
        }
      } catch (e) {
        console.error('Auth verification failed:', e)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }

    // Fall back to guest user
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (e) {
        console.error('Failed to parse stored user:', e)
        createGuestUser()
      }
    } else {
      createGuestUser()
    }
    setIsLoading(false)
  }

  const createGuestUser = () => {
    const guestUser: User = {
      id: generateGuestId(),
      username: generateGuestUsername(),
      isGuest: true,
      createdAt: new Date().toISOString(),
    }
    setUser(guestUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser))
  }

  // Update username for guest users
  const updateGuestUsername = useCallback((newUsername: string): boolean => {
    if (!user || !user.isGuest) return false
    
    const cleanUsername = newUsername.trim().toUpperCase().slice(0, 20)
    if (cleanUsername.length < 3) return false
    
    // Check for invalid characters
    if (!/^[A-Z0-9_]+$/.test(cleanUsername)) return false
    
    const updatedUser: User = {
      ...user,
      username: cleanUsername,
    }
    setUser(updatedUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
    return true
  }, [user])

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim().toUpperCase(), 
          password 
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      // Store auth token
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token }))
      setAuthToken(data.token)
      
      // Set user
      setUser({
        id: data.user.id,
        username: data.user.username,
        isGuest: false,
        createdAt: data.user.createdAt,
      })
      
      // Remove guest user data
      localStorage.removeItem(USER_STORAGE_KEY)
      
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

  // Signup function - accepts local data to transfer to server
  const signup = useCallback(async (
    username: string, 
    password: string,
    localData?: { 
      currency: { doryaCoins: number; premiumCoins: number }
      inventory: { 
        ownedItems: string[]
        selectedStage: string
        selectedElectricColor: string
        selectedCharacter: string
        selectedDummy: string 
      } 
    }
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
        body: JSON.stringify({ 
          username: cleanUsername, 
          password,
          // Transfer local data to server
          localData,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Signup failed' }
      }

      // Store auth token
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token }))
      setAuthToken(data.token)
      
      // Set user
      setUser({
        id: data.user.id,
        username: data.user.username,
        isGuest: false,
        createdAt: data.user.createdAt,
      })
      
      // Remove guest user data
      localStorage.removeItem(USER_STORAGE_KEY)
      
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
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthToken(null)
    createGuestUser()
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

