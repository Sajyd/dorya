'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AudioSettings {
  musicEnabled: boolean
  sfxEnabled: boolean
  musicVolume: number
  sfxVolume: number
  showFps: boolean
}

interface AudioContextType {
  settings: AudioSettings
  setMusicEnabled: (enabled: boolean) => void
  setSfxEnabled: (enabled: boolean) => void
  setMusicVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  setShowFps: (show: boolean) => void
}

const defaultSettings: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  showFps: false,
}

const AudioContext = createContext<AudioContextType | null>(null)

const STORAGE_KEY = 'dorya-audio-settings'

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({
          ...defaultSettings,
          ...parsed,
        })
      }
    } catch (e) {
      console.error('Failed to load audio settings:', e)
    }
    setIsInitialized(true)
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (e) {
        console.error('Failed to save audio settings:', e)
      }
    }
  }, [settings, isInitialized])

  const setMusicEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, musicEnabled: enabled }))
  }

  const setSfxEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, sfxEnabled: enabled }))
  }

  const setMusicVolume = (volume: number) => {
    setSettings(prev => ({ ...prev, musicVolume: Math.max(0, Math.min(1, volume)) }))
  }

  const setSfxVolume = (volume: number) => {
    setSettings(prev => ({ ...prev, sfxVolume: Math.max(0, Math.min(1, volume)) }))
  }

  const setShowFps = (show: boolean) => {
    setSettings(prev => ({ ...prev, showFps: show }))
  }

  return (
    <AudioContext.Provider
      value={{
        settings,
        setMusicEnabled,
        setSfxEnabled,
        setMusicVolume,
        setSfxVolume,
        setShowFps,
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

