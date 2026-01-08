'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode } from '@/types/game'
import { useCustomization } from '@/lib/customizationContext'
import { useUser } from '@/context/UserContext'
import { useAudio } from '@/context/AudioContext'

interface MainMenuProps {
  onPlay: (mode: GameMode) => void
  onHowTo: () => void
  onLadder: () => void
  onShop: () => void
  onLocker: () => void
  onSettings: () => void
}

export default function MainMenu({ onPlay, onHowTo, onLadder, onShop, onLocker, onSettings }: MainMenuProps) {
  const [showModes, setShowModes] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const audioSettingsRef = useRef<HTMLDivElement>(null)
  const { currency } = useCustomization()
  const { user, isLoggedIn, isLoading } = useUser()
  const { settings, setMusicEnabled, setSfxEnabled } = useAudio()

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>
        }
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen()
        }
      } else {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>
        }
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  // Detect mobile/small screen (check both width and height for landscape mode)
  useEffect(() => {
    const checkMobile = () => {
      const isSmallWidth = window.innerWidth < 768
      const isSmallHeight = window.innerHeight < 700
      setIsMobile(isSmallWidth || isSmallHeight)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close audio settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audioSettingsRef.current && !audioSettingsRef.current.contains(event.target as Node)) {
        setShowAudioSettings(false)
      }
    }

    if (showAudioSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAudioSettings])

  const gameModes: { mode: GameMode; label: string; description: string }[] = [
    { mode: 'DORYA_STREAK', label: 'DORYA STREAK', description: 'Max consecutive Doryas' },
    { mode: 'PEWGF_MINUTE', label: 'PEWGF RUSH', description: 'Perfect electrics in 60 seconds' },
    { mode: 'SURVIVAL', label: 'SURVIVAL', description: 'Keep the streak alive' },
    { mode: 'FREESTYLE', label: 'FREESTYLE', description: 'Practice without pressure' },
  ]

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* User display - top left */}
      <motion.button
        onClick={onSettings}
        className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex items-center gap-2 md:gap-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-700 hover:border-tekken-gold transition-all group"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.02 }}
      >
        {isLoading ? (
          <span className="font-tekken text-gray-500 tracking-wider text-xs md:text-sm">LOADING...</span>
        ) : (
          <>
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-tekken-gold to-orange-600 flex items-center justify-center">
              <span className="font-display text-xs md:text-sm text-black">{user?.username?.charAt(0) || '?'}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-tekken text-white tracking-wider text-xs md:text-sm group-hover:text-tekken-gold transition-colors max-w-[80px] md:max-w-none truncate">
                {user?.username}
              </span>
              <span className={`text-[8px] md:text-[10px] font-tekken tracking-wider ${isLoggedIn ? 'text-green-400' : 'text-gray-500'}`}>
                {isLoggedIn ? '✓ REGISTERED' : 'GUEST'}
              </span>
            </div>
            <span className="text-gray-600 group-hover:text-gray-400 transition-colors ml-1 hidden md:inline">⚙</span>
          </>
        )}
      </motion.button>

      {/* Currency display - top right */}
      <motion.div 
        className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-2 md:gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 md:px-4 md:py-2 rounded-full border border-yellow-500/30">
          <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
          <span className="font-tekken text-yellow-400 tracking-wider text-xs md:text-base">{currency.doryaCoins.toLocaleString()}</span>
        </div>
      </motion.div>
      
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      
      {/* Electric grid effect */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-scroll 20s linear infinite',
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-electric-blue rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              opacity: 0,
            }}
            animate={{
              y: [null, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Main content container - scaled down on mobile */}
      <div 
        className="relative z-10 flex flex-col items-center"
        style={{ 
          transform: isMobile ? 'scale(0.5)' : 'scale(1)',
          transformOrigin: 'center center'
        }}
      >
        {/* Main title */}
        <motion.div 
          className="text-center mb-16"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="font-display text-[10rem] lg:text-[12rem] leading-none tracking-tighter text-white electric-text">
            DORYA!
          </h1>
          <motion.p 
            className="font-tekken text-xl tracking-[0.5em] text-electric-blue mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            ELECTRIC WIND GOD FIST TRAINING
          </motion.p>
        </motion.div>

        {/* Menu buttons */}
        <motion.div 
          className="flex flex-col gap-6 w-full max-w-md"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {!showModes && !showCustomize ? (
              <motion.div
                key="main-menu"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button 
                  className="menu-button group"
                  onClick={() => setShowModes(true)}
                >
                  <span className="relative z-10">PLAY</span>
                  <motion.div
                    className="absolute right-6 top-1/2 -translate-y-1/2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.div>
                </button>
                
                <button 
                  className="menu-button group text-tekken-gold border-tekken-gold hover:bg-tekken-gold hover:text-black"
                  onClick={() => setShowCustomize(true)}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">⚡ CUSTOMIZE</span>
                  <motion.div
                    className="absolute right-6 top-1/2 -translate-y-1/2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.div>
                </button>
                
                <button className="menu-button" onClick={onHowTo}>
                  <span className="relative z-10">HOW TO PLAY</span>
                </button>
                
                <button className="menu-button" onClick={onLadder}>
                  <span className="relative z-10">LADDER</span>
                </button>
              </motion.div>
            ) : showModes ? (
              <motion.div
                key="mode-select"
                className="flex flex-col gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.button
                  className="text-electric-blue font-tekken text-lg tracking-wider mb-4 flex items-center gap-2 hover:text-white transition-colors"
                  onClick={() => setShowModes(false)}
                  whileHover={{ x: -5 }}
                >
                  ← BACK
                </motion.button>
                
                {gameModes.map((gameMode, index) => (
                  <motion.button
                    key={gameMode.mode}
                    className="menu-button text-left flex flex-col items-start py-3"
                    onClick={() => onPlay(gameMode.mode)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="text-xl">{gameMode.label}</span>
                    <span className="text-sm text-gray-400 font-sans tracking-normal normal-case">
                      {gameMode.description}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="customize-select"
                className="flex flex-col gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.button
                  className="text-electric-blue font-tekken text-lg tracking-wider mb-4 flex items-center gap-2 hover:text-white transition-colors"
                  onClick={() => setShowCustomize(false)}
                  whileHover={{ x: -5 }}
                >
                  ← BACK
                </motion.button>
                
                <motion.button
                  className="menu-button text-left flex flex-col items-start py-3 text-tekken-gold border-tekken-gold hover:bg-tekken-gold hover:text-black"
                  onClick={onShop}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                >
                  <span className="text-xl">🎁 SHOP</span>
                  <span className="text-sm text-gray-400 font-sans tracking-normal normal-case">
                    Buy crates and items with Dorya Coins
                  </span>
                </motion.button>
                
                <motion.button
                  className="menu-button text-left flex flex-col items-start py-3"
                  onClick={onLocker}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="text-xl">🎨 LOCKER</span>
                  <span className="text-sm text-gray-400 font-sans tracking-normal normal-case">
                    Equip your unlocked items
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom Left Controls - Fullscreen & Audio */}
      <div className="absolute left-3 bottom-3 md:left-4 md:bottom-4 z-20 flex items-center gap-2">
        {/* Fullscreen Button */}
        <motion.button
          onClick={toggleFullscreen}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm border flex items-center justify-center transition-all duration-300 ${
            isFullscreen 
              ? 'border-electric-blue text-electric-blue' 
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
          }`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg 
              className="w-5 h-5 md:w-6 md:h-6" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5 md:w-6 md:h-6" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          )}
        </motion.button>

        {/* Audio Settings Button */}
        <div ref={audioSettingsRef} className="relative">
        <motion.button
          onClick={() => setShowAudioSettings(!showAudioSettings)}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm border flex items-center justify-center transition-all duration-300 ${
            showAudioSettings 
              ? 'border-tekken-gold text-tekken-gold' 
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
          }`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg 
            className="w-5 h-5 md:w-6 md:h-6" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </motion.button>

        {/* Audio Settings Dropdown */}
        <AnimatePresence>
          {showAudioSettings && (
            <motion.div
              className="absolute left-0 bottom-12 md:bottom-14 w-48 md:w-56 bg-black/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 md:p-4 shadow-2xl"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-tekken text-xs md:text-sm text-tekken-gold tracking-wider mb-3 md:mb-4">
                AUDIO SETTINGS
              </h3>
              
              {/* Music Toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg 
                    className="w-4 h-4 md:w-5 md:h-5 text-gray-400" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span className="font-tekken text-[10px] md:text-xs text-gray-300 tracking-wider">MUSIC</span>
                </div>
                <button
                  onClick={() => setMusicEnabled(!settings.musicEnabled)}
                  className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                    settings.musicEnabled 
                      ? 'bg-tekken-gold' 
                      : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 md:w-5 md:h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-200 ${
                      settings.musicEnabled ? 'left-[22px] md:left-[26px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* SFX Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg 
                    className="w-4 h-4 md:w-5 md:h-5 text-gray-400" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                  <span className="font-tekken text-[10px] md:text-xs text-gray-300 tracking-wider">SFX</span>
                </div>
                <button
                  onClick={() => setSfxEnabled(!settings.sfxEnabled)}
                  className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                    settings.sfxEnabled 
                      ? 'bg-electric-blue' 
                      : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 md:w-5 md:h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-200 ${
                      settings.sfxEnabled ? 'left-[22px] md:left-[26px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Discord Button */}
      <motion.a
        href="https://discord.gg/VbKJ374Qdd"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 bg-[#5865F2]/20 border border-[#5865F2]/50 rounded-lg text-[#5865F2] font-tekken text-[10px] md:text-sm tracking-wider hover:bg-[#5865F2]/30 hover:border-[#5865F2] hover:text-white transition-all duration-300 group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg 
          className="w-4 h-4 md:w-5 md:h-5 group-hover:animate-pulse" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <span className="hidden sm:inline">JOIN DISCORD</span>
        <span className="sm:hidden">DISCORD</span>
      </motion.a>

      {/* Footer - Hidden on mobile */}
      <motion.div 
        className="absolute bottom-8 text-center text-gray-600 font-tekken text-xs md:text-sm tracking-widest hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p>PRESS F, N, D, DF+2 FOR ELECTRIC</p>
        <p className="mt-1 text-xs">INSPIRED BY TEKKEN</p>
      </motion.div>

      <style jsx>{`
        @keyframes grid-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  )
}
