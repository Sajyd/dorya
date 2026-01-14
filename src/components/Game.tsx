'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode, ActiveCustomization, WavedashAttempt, PlayerSide } from '@/types/game'
import { useGameState } from '@/hooks/useGameState'
import { useGameInput } from '@/hooks/useGameInput'
import { useCustomization } from '@/lib/customizationContext'
import { useAudio } from '@/context/AudioContext'
import { calculateCoinsEarned } from '@/lib/customizationData'
import GameScene from './GameScene'
import GameHUD from './GameHUD'
import CommandHistory from './CommandHistory'
import ResultScreen from './ResultScreen'
import MobileControls from './MobileControls'

// Helper to get display name for key codes
function getKeyDisplayName(keyCode: string): string {
  if (keyCode.startsWith('Key')) {
    return keyCode.replace('Key', '')
  }
  if (keyCode.startsWith('Digit')) {
    return keyCode.replace('Digit', '')
  }
  const specialKeys: Record<string, string> = {
    'Space': 'SPACE',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ShiftLeft': 'L SHIFT',
    'ShiftRight': 'R SHIFT',
    'ControlLeft': 'L CTRL',
    'ControlRight': 'R CTRL',
    'Enter': 'ENTER',
  }
  return specialKeys[keyCode] || keyCode
}

// Audio refs for sound effects
const DORYA_SFX_PATH = '/assets/sfx/dorya.ogg'
const MHH_SFX_PATH = '/assets/sfx/mhh.ogg'

// Audio pool size - limits max concurrent sounds to prevent lag
const AUDIO_POOL_SIZE = 6

interface GameProps {
  mode: GameMode
  onBack: () => void
}

const modeLabels: Record<GameMode, string> = {
  DORYA_STREAK: 'DORYA STREAK',
  PEWGF_MINUTE: 'PEWGF RUSH',
  SURVIVAL: 'SURVIVAL',
  FREESTYLE: 'FREESTYLE',
}

export default function Game({ mode, onBack }: GameProps) {
  const [showResult, setShowResult] = useState(false)
  const [coinsEarned, setCoinsEarned] = useState(0)
  // Player side selection - null means needs to be selected (when keybindings.playerSide === 'ask')
  const [selectedSide, setSelectedSide] = useState<'p1' | 'p2' | null>(null)
  const [showSideSelection, setShowSideSelection] = useState(false)
  
  // Viewport scale for mobile responsiveness (based on height)
  const [uiScale, setUiScale] = useState(1)
  
  // Track viewport height and calculate scale
  useEffect(() => {
    const calculateScale = () => {
      const vh = window.innerHeight
      const vw = window.innerWidth
      // For landscape mobile (height < 500px and width > height), scale down
      if (vh < 500 && vw > vh) {
        // Scale proportionally: at 300px height use 0.5, at 500px use 1
        const scale = Math.max(0.5, Math.min(1, vh / 500))
        setUiScale(scale)
      } else if (vh < 600) {
        // Portrait small screens
        const scale = Math.max(0.7, Math.min(1, vh / 600))
        setUiScale(scale)
      } else {
        setUiScale(1)
      }
    }
    
    calculateScale()
    window.addEventListener('resize', calculateScale)
    window.addEventListener('orientationchange', calculateScale)
    
    return () => {
      window.removeEventListener('resize', calculateScale)
      window.removeEventListener('orientationchange', calculateScale)
    }
  }, [])
  
  // Get audio settings
  const { settings: audioSettings } = useAudio()
  
  // Store current volume for creating new audio instances
  const sfxVolumeRef = useRef(audioSettings.sfxVolume)
  
  // Audio pools to reuse audio instances (prevents memory leaks and lag)
  const doryaPoolRef = useRef<HTMLAudioElement[]>([])
  const doryaPoolIndexRef = useRef(0)
  const mhhPoolRef = useRef<HTMLAudioElement[]>([])
  const mhhPoolIndexRef = useRef(0)
  
  // Initialize audio pools once
  useEffect(() => {
    // Create dorya sound pool
    doryaPoolRef.current = Array.from({ length: AUDIO_POOL_SIZE }, () => {
      const audio = new Audio(DORYA_SFX_PATH)
      audio.volume = sfxVolumeRef.current
      return audio
    })
    
    // Create mhh sound pool (smaller, less frequent)
    mhhPoolRef.current = Array.from({ length: 3 }, () => {
      const audio = new Audio(MHH_SFX_PATH)
      audio.volume = sfxVolumeRef.current
      return audio
    })
    
    // Cleanup on unmount
    return () => {
      doryaPoolRef.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      mhhPoolRef.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      doryaPoolRef.current = []
      mhhPoolRef.current = []
    }
  }, [])
  
  // Update volume ref and pool volumes when settings change
  useEffect(() => {
    sfxVolumeRef.current = audioSettings.sfxVolume
    doryaPoolRef.current.forEach(audio => {
      audio.volume = audioSettings.sfxVolume
    })
    mhhPoolRef.current.forEach(audio => {
      audio.volume = audioSettings.sfxVolume
    })
  }, [audioSettings.sfxVolume])
  
  // Function to play dorya sound using pool (cycles through instances)
  const playDoryaSound = useCallback(() => {
    const pool = doryaPoolRef.current
    if (pool.length === 0) return
    
    const audio = pool[doryaPoolIndexRef.current]
    doryaPoolIndexRef.current = (doryaPoolIndexRef.current + 1) % pool.length
    
    // Reset and play (interrupts if still playing, which is fine)
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])
  
  // Function to play mhh sound using pool
  const playMhhSound = useCallback(() => {
    const pool = mhhPoolRef.current
    if (pool.length === 0) return
    
    const audio = pool[mhhPoolIndexRef.current]
    mhhPoolIndexRef.current = (mhhPoolIndexRef.current + 1) % pool.length
    
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])
  
  const { activeCustomization, addCoins, keybindings } = useCustomization()
  
  const {
    state,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    handleAttempt,
    resetGame,
  } = useGameState(mode)

  const onDoryaAttempt = useCallback((attempt: Parameters<typeof handleAttempt>[0]) => {
    // Skip scoring for macro attempts (but still play sounds for feedback)
    if (!attempt.isMacro) {
      handleAttempt(attempt)
    }
    
    // Play sound effects based on result (only if SFX is enabled)
    if (!audioSettings.sfxEnabled) return
    
    if (attempt.result === 'perfect' || attempt.result === 'good' || attempt.result === 'bad') {
      // Successful EWGF - play dorya sound (new instance for overlapping)
      playDoryaSound()
    } else if (attempt.result === 'miss') {
      // Miss - play mhh sound
      playMhhSound()
    }
  }, [handleAttempt, audioSettings.sfxEnabled, playDoryaSound, playMhhSound])

  const onWavedash = useCallback((attempt: WavedashAttempt) => {
    // Wavedash detected - this is the f, n, d, df motion
    // Currently just for validation/debugging - can add visual feedback later
    console.log('Wavedash detected:', attempt.isClean ? 'Clean' : 'Sloppy')
  }, [])

  // Initialize side selection based on keybindings
  useEffect(() => {
    if (keybindings.playerSide === 'ask') {
      setSelectedSide(null)
      setShowSideSelection(true)
    } else {
      setSelectedSide(keybindings.playerSide)
      setShowSideSelection(false)
    }
  }, [keybindings.playerSide])

  // Get the active side for the game (default to p1 if not selected yet)
  const activeSide: 'p1' | 'p2' = selectedSide || 'p1'

  const {
    lastAttempt,
    lastWavedash,
    activeKeys,
    inputHistory,
    handleTouchInput,
    controllerConnected,
  } = useGameInput(state.isPlaying && !state.isPaused, onDoryaAttempt, onWavedash, keybindings, activeSide, audioSettings.devMacrosEnabled)

  const handleSelectSide = (side: 'p1' | 'p2') => {
    setSelectedSide(side)
    setShowSideSelection(false)
  }

  const handleStart = () => {
    setShowResult(false)
    startGame()
  }

  const handleEnd = () => {
    endGame()
    // Calculate and award coins
    const earned = calculateCoinsEarned(state.perfectCount, state.goodCount, state.maxStreak, mode === 'PEWGF_MINUTE')
    setCoinsEarned(earned)
    addCoins(earned)
    setShowResult(true)
  }

  const handlePlayAgain = () => {
    setShowResult(false)
    resetGame()
    startGame()
  }

  const handleQuit = () => {
    resetGame()
    onBack()
  }

  // Handle ESC key for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.isPlaying && !state.isPaused) {
          pauseGame()
        } else if (state.isPaused) {
          resumeGame()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isPlaying, state.isPaused, pauseGame, resumeGame])

  // Track previous isPlaying state to detect game end
  const wasPlayingRef = useRef(state.isPlaying)
  
  // Detect automatic game end and show results
  useEffect(() => {
    const wasPlaying = wasPlayingRef.current
    wasPlayingRef.current = state.isPlaying
    
    // Game just ended automatically (was playing, now not playing)
    // This handles SURVIVAL (miss ends game) and PEWGF_MINUTE (timer ends)
    if (wasPlaying && !state.isPlaying && !showResult) {
      // Calculate and award coins
      const earned = calculateCoinsEarned(state.perfectCount, state.goodCount, state.maxStreak, mode === 'PEWGF_MINUTE')
      setCoinsEarned(earned)
      addCoins(earned)
      setShowResult(true)
    }
  }, [state.isPlaying, showResult, state.perfectCount, state.goodCount, state.maxStreak, mode, addCoins])

  return (
    <div className="h-full w-full relative overflow-hidden bg-black">
      {/* 3D Game Scene */}
      <div className="absolute inset-0">
        <GameScene
          isPlaying={state.isPlaying}
          lastAttempt={state.lastAttempt || lastAttempt}
          currentStreak={state.currentStreak}
          customization={activeCustomization}
          playerSide={activeSide}
        />
      </div>

      {/* HUD Overlay */}
      <GameHUD
        mode={mode}
        state={state}
        activeKeys={activeKeys}
        onPause={pauseGame}
        onBack={handleQuit}
        controllerConnected={controllerConnected}
        keybindings={keybindings}
      />

      {/* Command History - scaled down on mobile */}
      <div className="absolute left-2 bottom-20 z-20 scale-75 origin-bottom-left lg:left-4 lg:bottom-4 lg:scale-100">
        <CommandHistory inputs={inputHistory} lastAttempt={state.lastAttempt || lastAttempt} playerSide={activeSide} />
      </div>

      {/* Mobile Touch Controls */}
      <MobileControls 
        isPlaying={state.isPlaying && !state.isPaused && !showResult}
        onInputChange={handleTouchInput}
      />

      {/* Side Selection Screen */}
      <AnimatePresence>
        {showSideSelection && !state.isPlaying && !showResult && (
          <motion.div
            className="absolute inset-0 z-35 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="text-center"
              style={{ transform: `scale(${uiScale})`, transformOrigin: 'center center' }}
            >
              <motion.h2
                className="font-display text-3xl sm:text-4xl md:text-5xl text-white mb-2 sm:mb-3 md:mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                SELECT SIDE
              </motion.h2>
              
              <motion.p
                className="text-gray-400 mb-4 sm:mb-6 md:mb-8 font-sans max-w-md mx-auto text-sm md:text-base px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Choose which side you want to play on. P2 side inverts your controls.
              </motion.p>

              <motion.div
                className="flex gap-4 sm:gap-5 md:gap-6 justify-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  className="group relative px-8 py-5 sm:px-10 sm:py-6 md:px-12 md:py-8 border-2 border-electric-blue rounded-lg hover:bg-electric-blue/20 transition-all"
                  onClick={() => handleSelectSide('p1')}
                >
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-1 md:mb-2">←</div>
                  <div className="font-tekken text-xl sm:text-2xl text-electric-blue tracking-wider">P1</div>
                  <div className="text-gray-500 text-xs sm:text-sm mt-1 md:mt-2">Left Side</div>
                  <div className="text-gray-600 text-[10px] md:text-xs mt-1 hidden md:block">Forward = {getKeyDisplayName(keybindings.forward)}</div>
                </button>
                
                <button
                  className="group relative px-8 py-5 sm:px-10 sm:py-6 md:px-12 md:py-8 border-2 border-tekken-gold rounded-lg hover:bg-tekken-gold/20 transition-all"
                  onClick={() => handleSelectSide('p2')}
                >
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-1 md:mb-2">→</div>
                  <div className="font-tekken text-xl sm:text-2xl text-tekken-gold tracking-wider">P2</div>
                  <div className="text-gray-500 text-xs sm:text-sm mt-1 md:mt-2">Right Side</div>
                  <div className="text-gray-600 text-[10px] md:text-xs mt-1 hidden md:block">Forward = {getKeyDisplayName(keybindings.backward || 'KeyA')}</div>
                </button>
              </motion.div>

              <motion.div
                className="mt-6 sm:mt-7 md:mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  className="text-gray-500 hover:text-white transition-colors font-tekken tracking-wider text-sm md:text-base"
                  onClick={handleQuit}
                >
                  ← BACK TO MENU
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Screen */}
      <AnimatePresence>
        {!state.isPlaying && !showResult && !showSideSelection && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="text-center"
              style={{ transform: `scale(${uiScale})`, transformOrigin: 'center center' }}
            >
              <motion.h2
                className="font-display text-4xl sm:text-5xl md:text-6xl text-white mb-2 sm:mb-3 md:mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {modeLabels[mode]}
              </motion.h2>
              
              <motion.p
                className="text-gray-400 mb-4 sm:mb-6 md:mb-8 font-sans text-sm md:text-base px-4 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {mode === 'DORYA_STREAK' && 'Get the highest consecutive Dorya streak'}
                {mode === 'PEWGF_MINUTE' && 'Execute as many Perfect Electrics as you can in 60 seconds'}
                {mode === 'SURVIVAL' && 'Keep the streak alive - one miss ends it all'}
                {mode === 'FREESTYLE' && 'Practice without pressure'}
              </motion.p>

              {/* Show selected side indicator */}
              <motion.div
                className="mb-4 sm:mb-5 md:mb-6 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <div className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border-2 font-tekken text-xs sm:text-sm tracking-wider
                  ${activeSide === 'p1' ? 'border-electric-blue text-electric-blue' : 'border-tekken-gold text-tekken-gold'}
                `}>
                  {activeSide === 'p1' ? '← PLAYER 1 SIDE' : 'PLAYER 2 SIDE →'}
                </div>
              </motion.div>

              <motion.div
                className="space-y-3 sm:space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  className="menu-button text-tekken-gold border-tekken-gold hover:bg-tekken-gold hover:text-black text-sm md:text-base px-6 sm:px-8 py-2 sm:py-3"
                  onClick={handleStart}
                >
                  START
                </button>
                
                {/* Only show change side button if playerSide is 'ask' */}
                {keybindings.playerSide === 'ask' && (
                  <div>
                    <button
                      className="text-gray-400 hover:text-white transition-colors font-tekken tracking-wider text-xs sm:text-sm"
                      onClick={() => setShowSideSelection(true)}
                    >
                      CHANGE SIDE
                    </button>
                  </div>
                )}
                
                <div>
                  <button
                    className="text-gray-500 hover:text-white transition-colors font-tekken tracking-wider text-xs sm:text-sm md:text-base"
                    onClick={handleQuit}
                  >
                    ← BACK TO MENU
                  </button>
                </div>
              </motion.div>

              <motion.div
                className="mt-8 sm:mt-10 md:mt-12 text-gray-600 font-mono text-xs sm:text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {/* Controller indicator */}
                {controllerConnected && (
                  <div className="hidden md:flex items-center justify-center gap-2 mb-3 text-green-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    </svg>
                    <span className="font-tekken text-xs tracking-wider">CONTROLLER CONNECTED</span>
                  </div>
                )}
                {/* Desktop controls */}
                <div className="hidden md:block">
                  {controllerConnected ? (
                    <>
                      <p>Controls: → Release → ↓ → ↓→+A/B/X/Y</p>
                      <p className="text-xs mt-1">(D-pad/Stick: Right, Neutral, Down, Down-Right + Face Button)</p>
                    </>
                  ) : (
                    <>
                      <p>Controls: {getKeyDisplayName(keybindings.forward)} → Release → {getKeyDisplayName(keybindings.down)} → {getKeyDisplayName(keybindings.down)}+{getKeyDisplayName(keybindings.forward)}+{getKeyDisplayName(keybindings.punch)}</p>
                      <p className="text-xs mt-1">(Forward, Neutral, Down, Down-Forward+Punch)</p>
                    </>
                  )}
                </div>
                {/* Mobile controls hint */}
                <div className="md:hidden text-xs">
                  <p>Touch: → Release → ↓ → ↓+→+🔴</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Screen */}
      <AnimatePresence>
        {state.isPaused && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <h2 className="font-display text-6xl text-white mb-8">PAUSED</h2>
              
              <div className="space-y-4">
                <button
                  className="menu-button"
                  onClick={resumeGame}
                >
                  RESUME
                </button>
                
                <div>
                  <button
                    className="text-gray-500 hover:text-tekken-red transition-colors font-tekken tracking-wider"
                    onClick={handleEnd}
                  >
                    END GAME
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Screen */}
      <AnimatePresence>
        {showResult && (
          <ResultScreen
            mode={mode}
            state={state}
            onPlayAgain={handlePlayAgain}
            onQuit={handleQuit}
            coinsEarned={coinsEarned}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

