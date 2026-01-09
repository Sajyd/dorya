'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode, ActiveCustomization, WavedashAttempt } from '@/types/game'
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

// Audio refs for sound effects
const DORYA_SFX_PATH = '/assets/sfx/dorya.ogg'
const MHH_SFX_PATH = '/assets/sfx/mhh.ogg'

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
  
  // Get audio settings
  const { settings: audioSettings } = useAudio()
  
  // Store current volume for creating new audio instances
  const sfxVolumeRef = useRef(audioSettings.sfxVolume)
  
  // Update volume ref when settings change
  useEffect(() => {
    sfxVolumeRef.current = audioSettings.sfxVolume
  }, [audioSettings.sfxVolume])
  
  // Function to play dorya sound (creates new instance each time for overlapping)
  const playDoryaSound = useCallback(() => {
    const audio = new Audio(DORYA_SFX_PATH)
    audio.volume = sfxVolumeRef.current
    audio.play().catch(() => {})
    // Clean up after playback ends
    audio.onended = () => {
      audio.remove()
    }
  }, [])
  
  // Function to play mhh sound
  const playMhhSound = useCallback(() => {
    const audio = new Audio(MHH_SFX_PATH)
    audio.volume = sfxVolumeRef.current
    audio.play().catch(() => {})
    audio.onended = () => {
      audio.remove()
    }
  }, [])
  
  const { activeCustomization, addCoins } = useCustomization()
  
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
    handleAttempt(attempt)
    
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

  const {
    lastAttempt,
    lastWavedash,
    activeKeys,
    inputHistory,
    handleTouchInput,
    controllerConnected,
  } = useGameInput(state.isPlaying && !state.isPaused, onDoryaAttempt, onWavedash)

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
      />

      {/* Command History - scaled down on mobile */}
      <div className="absolute left-2 bottom-20 z-20 scale-75 origin-bottom-left lg:left-4 lg:bottom-4 lg:scale-100">
        <CommandHistory inputs={inputHistory} lastAttempt={state.lastAttempt || lastAttempt} />
      </div>

      {/* Mobile Touch Controls */}
      <MobileControls 
        isPlaying={state.isPlaying && !state.isPaused && !showResult}
        onInputChange={handleTouchInput}
      />

      {/* Start Screen */}
      <AnimatePresence>
        {!state.isPlaying && !showResult && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="font-display text-6xl text-white mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {modeLabels[mode]}
              </motion.h2>
              
              <motion.p
                className="text-gray-400 mb-8 font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {mode === 'DORYA_STREAK' && 'Get the highest consecutive Dorya streak'}
                {mode === 'PEWGF_MINUTE' && 'Execute as many Perfect Electrics as you can in 60 seconds'}
                {mode === 'SURVIVAL' && 'Keep the streak alive - one miss ends it all'}
                {mode === 'FREESTYLE' && 'Practice without pressure'}
              </motion.p>

              <motion.div
                className="space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  className="menu-button text-tekken-gold border-tekken-gold hover:bg-tekken-gold hover:text-black"
                  onClick={handleStart}
                >
                  START
                </button>
                
                <div>
                  <button
                    className="text-gray-500 hover:text-white transition-colors font-tekken tracking-wider"
                    onClick={handleQuit}
                  >
                    ← BACK TO MENU
                  </button>
                </div>
              </motion.div>

              <motion.div
                className="mt-12 text-gray-600 font-mono text-sm"
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
                      <p>Controls: D → Release → S → S+D+K</p>
                      <p className="text-xs mt-1">(Forward, Neutral, Down, Down-Forward+Punch)</p>
                    </>
                  )}
                </div>
                {/* Mobile controls hint */}
                <div className="md:hidden">
                  <p>Touch Controls:</p>
                  <p className="text-xs mt-1">→ Release → ↓ → ↓+→+🔴</p>
                  <p className="text-[10px] mt-2 text-gray-500">(Forward, Neutral, Down, Down-Forward+Punch)</p>
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

