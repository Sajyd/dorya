'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { UserSettings, DEFAULT_USER_SETTINGS, GraphicsQuality } from '@/types/game'

// Re-export GraphicsQuality for components that import from here
export type { GraphicsQuality } from '@/types/game'

interface AudioContextType {
  settings: UserSettings
  setMusicEnabled: (enabled: boolean) => void
  setSfxEnabled: (enabled: boolean) => void
  setMusicVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  setShowFps: (show: boolean) => void
  setGraphicsQuality: (quality: GraphicsQuality) => void
  setDevMacrosEnabled: (enabled: boolean) => void
  // Sync function to be called by customization context
  syncSettings: (newSettings: UserSettings) => void
  // Callback to notify when settings change
  onSettingsChange: ((settings: UserSettings) => void) | null
  setOnSettingsChange: (callback: ((settings: UserSettings) => void) | null) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

const STORAGE_KEY = 'dorya-audio-settings'

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  const [isInitialized, setIsInitialized] = useState(false)
  const onSettingsChangeRef = useRef<((settings: UserSettings) => void) | null>(null)

  // Load settings from localStorage on mount (fallback for before server sync)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({
          ...DEFAULT_USER_SETTINGS,
          ...parsed,
        })
      }
    } catch (e) {
      console.error('Failed to load audio settings:', e)
    }
    setIsInitialized(true)
  }, [])

  // Save settings to localStorage when they change (as a backup)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save audio settings:', e)
      }
    }
  }, [settings, isInitialized])

  // Notify customization context when settings change
  const updateSettingsAndNotify = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings)
    if (onSettingsChangeRef.current) {
      onSettingsChangeRef.current(newSettings)
    }
  }, [])

  const setMusicEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, musicEnabled: enabled }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setSfxEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, sfxEnabled: enabled }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setMusicVolume = useCallback((volume: number) => {
    const newSettings = { ...settings, musicVolume: Math.max(0, Math.min(1, volume)) }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setSfxVolume = useCallback((volume: number) => {
    const newSettings = { ...settings, sfxVolume: Math.max(0, Math.min(1, volume)) }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setShowFps = useCallback((show: boolean) => {
    const newSettings = { ...settings, showFps: show }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    const newSettings = { ...settings, graphicsQuality: quality }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  const setDevMacrosEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, devMacrosEnabled: enabled }
    updateSettingsAndNotify(newSettings)
  }, [settings, updateSettingsAndNotify])

  // Sync settings from customization context (called on init/login)
  const syncSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings)
  }, [])

  const setOnSettingsChange = useCallback((callback: ((settings: UserSettings) => void) | null) => {
    onSettingsChangeRef.current = callback
  }, [])

  return (
    <AudioContext.Provider
      value={{
        settings,
        setMusicEnabled,
        setSfxEnabled,
        setMusicVolume,
        setSfxVolume,
        setShowFps,
        setGraphicsQuality,
        setDevMacrosEnabled,
        syncSettings,
        onSettingsChange: onSettingsChangeRef.current,
        setOnSettingsChange,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
