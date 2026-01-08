'use client'

import { useEffect, useRef, useState } from 'react'
import { useAudio } from '@/context/AudioContext'

type MusicTrack = 'menu' | 'shop' | 'game' | 'none'

interface AudioManagerProps {
  currentScreen: string
}

const MUSIC_PATHS: Record<MusicTrack, string> = {
  menu: '/assets/music/mainmenu.ogg',
  shop: '/assets/music/shop.ogg',
  game: '/assets/music/trainingstage.ogg',
  none: '',
}

// Map screen names to music tracks
function getTrackForScreen(screen: string): MusicTrack {
  switch (screen) {
    case 'menu':
    case 'howto':
    case 'ladder':
    case 'locker':
    case 'settings':
      return 'menu'
    case 'shop':
      return 'shop'
    case 'game':
      return 'game'
    default:
      return 'menu'
  }
}

export default function AudioManager({ currentScreen }: AudioManagerProps) {
  const { settings } = useAudio()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>('none')
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Listen for first user interaction to enable audio playback
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true)
      // Clean up listeners after first interaction
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }

    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.loop = true
    audioRef.current.volume = settings.musicVolume

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Handle track changes with crossfade
  useEffect(() => {
    const targetTrack = getTrackForScreen(currentScreen)
    
    if (targetTrack === currentTrack) return
    if (!audioRef.current) return
    if (!hasUserInteracted) {
      // Queue the track change for when user interacts
      setCurrentTrack(targetTrack)
      return
    }

    const audio = audioRef.current

    // Clear any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }

    // Fade out current track
    const fadeOutDuration = 500 // ms
    const fadeSteps = 20
    const fadeStepTime = fadeOutDuration / fadeSteps
    const volumeStep = audio.volume / fadeSteps

    let step = 0
    fadeIntervalRef.current = setInterval(() => {
      step++
      audio.volume = Math.max(0, settings.musicVolume - volumeStep * step)

      if (step >= fadeSteps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current)
        }

        // Switch to new track
        if (targetTrack !== 'none' && settings.musicEnabled) {
          audio.src = MUSIC_PATHS[targetTrack]
          audio.volume = 0
          audio.load()
          
          const playPromise = audio.play()
          if (playPromise) {
            playPromise.then(() => {
              // Fade in new track
              let fadeInStep = 0
              fadeIntervalRef.current = setInterval(() => {
                fadeInStep++
                audio.volume = Math.min(settings.musicVolume, (settings.musicVolume / fadeSteps) * fadeInStep)

                if (fadeInStep >= fadeSteps) {
                  if (fadeIntervalRef.current) {
                    clearInterval(fadeIntervalRef.current)
                  }
                }
              }, fadeStepTime)
            }).catch(() => {
              // Autoplay blocked, will retry on user interaction
            })
          }
        } else {
          audio.pause()
        }

        setCurrentTrack(targetTrack)
      }
    }, fadeStepTime)
  }, [currentScreen, currentTrack, hasUserInteracted, settings.musicEnabled, settings.musicVolume])

  // Handle music enabled/disabled toggle
  useEffect(() => {
    if (!audioRef.current) return

    if (settings.musicEnabled && hasUserInteracted && currentTrack !== 'none') {
      if (audioRef.current.paused) {
        audioRef.current.src = MUSIC_PATHS[currentTrack]
        audioRef.current.volume = settings.musicVolume
        audioRef.current.play().catch(() => {})
      }
    } else {
      audioRef.current.pause()
    }
  }, [settings.musicEnabled, hasUserInteracted, currentTrack, settings.musicVolume])

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current && !fadeIntervalRef.current) {
      audioRef.current.volume = settings.musicVolume
    }
  }, [settings.musicVolume])

  // Try to play when user first interacts
  useEffect(() => {
    if (hasUserInteracted && settings.musicEnabled && audioRef.current && currentTrack !== 'none') {
      if (audioRef.current.paused || !audioRef.current.src) {
        audioRef.current.src = MUSIC_PATHS[currentTrack]
        audioRef.current.volume = settings.musicVolume
        audioRef.current.play().catch(() => {})
      }
    }
  }, [hasUserInteracted, settings.musicEnabled, currentTrack, settings.musicVolume])

  return null // This is a non-visual component
}

