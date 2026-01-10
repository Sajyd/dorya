'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode, GameState, KeyBindings, DEFAULT_KEYBINDINGS } from '@/types/game'
import { useUser } from '@/context/UserContext'
import { useAudio } from '@/context/AudioContext'

// Helper to get short display name for key codes
function getKeyDisplayName(keyCode: string): string {
  if (keyCode.startsWith('Key')) {
    return keyCode.replace('Key', '')
  }
  if (keyCode.startsWith('Digit')) {
    return keyCode.replace('Digit', '')
  }
  const specialKeys: Record<string, string> = {
    'Space': 'SPC',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ShiftLeft': 'LSH',
    'ShiftRight': 'RSH',
    'ControlLeft': 'LCT',
    'ControlRight': 'RCT',
    'AltLeft': 'LAL',
    'AltRight': 'RAL',
    'Enter': 'ENT',
    'Backspace': 'BSP',
    'Tab': 'TAB',
    'Escape': 'ESC',
    'CapsLock': 'CAP',
    'Semicolon': ';',
    'Quote': "'",
    'Backquote': '`',
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backslash': '\\',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Minus': '-',
    'Equal': '=',
  }
  return specialKeys[keyCode] || keyCode
}

interface GameHUDProps {
  mode: GameMode
  state: GameState
  activeKeys: Set<string>
  onPause: () => void
  onBack: () => void
  controllerConnected?: boolean
  keybindings?: KeyBindings
  playerSide?: 'p1' | 'p2'
}

const modeLabels: Record<GameMode, string> = {
  DORYA_STREAK: 'STREAK',
  PEWGF_MINUTE: 'PEWGF RUSH',
  SURVIVAL: 'SURVIVAL',
  FREESTYLE: 'FREESTYLE',
}

export default function GameHUD({ mode, state, activeKeys, onPause, onBack, controllerConnected, keybindings = DEFAULT_KEYBINDINGS, playerSide = 'p1' }: GameHUDProps) {
  const { user } = useUser()
  const { settings } = useAudio()
  const [fps, setFps] = useState(0)
  const frameTimesRef = useRef<number[]>([])
  const lastFrameTimeRef = useRef(performance.now())
  const animationFrameRef = useRef<number>()
  
  // FPS calculation
  useEffect(() => {
    if (!settings.showFps) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }
    
    const measureFps = () => {
      const now = performance.now()
      const delta = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now
      
      frameTimesRef.current.push(delta)
      // Keep last 60 frames for averaging
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift()
      }
      
      // Calculate average FPS every 10 frames
      if (frameTimesRef.current.length % 10 === 0) {
        const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
        setFps(Math.round(1000 / avgDelta))
      }
      
      animationFrameRef.current = requestAnimationFrame(measureFps)
    }
    
    animationFrameRef.current = requestAnimationFrame(measureFps)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [settings.showFps])
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Key display helper
  const isKeyActive = (key: string) => activeKeys.has(key)

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* FPS Counter */}
      <AnimatePresence>
        {settings.showFps && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="px-2 py-0.5 bg-black/70 border border-gray-700/50 rounded text-xs font-mono text-gray-400">
              {fps} FPS
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
        {/* Left side - Mode and score */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="font-tekken text-sm tracking-widest text-gray-500">
              {modeLabels[mode]}
            </div>
            <span className="text-gray-700">|</span>
            <div className="font-tekken text-sm tracking-wider text-tekken-gold">
              {user?.username}
            </div>
          </div>
          
          {/* Timer for timed modes */}
          {mode === 'PEWGF_MINUTE' && (
            <motion.div
              className={`font-display text-5xl ${state.timeRemaining <= 10 ? 'text-tekken-red' : 'text-white'}`}
              animate={state.timeRemaining <= 10 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              {formatTime(state.timeRemaining)}
            </motion.div>
          )}
          
          {/* Elapsed time for survival */}
          {mode === 'SURVIVAL' && state.isPlaying && (
            <div className="font-display text-3xl text-white">
              {formatTime(state.elapsedTime)}
            </div>
          )}
        </div>

        {/* Center - Combo counter */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <AnimatePresence mode="popLayout">
            {state.currentStreak > 0 && (
              <motion.div
                key={state.currentStreak}
                initial={{ scale: 1.5, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 20 }}
                className="combo-number text-white"
              >
                {state.currentStreak}
              </motion.div>
            )}
          </AnimatePresence>
          {state.currentStreak > 0 && (
            <motion.div 
              className="font-tekken text-lg tracking-widest text-electric-blue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {state.currentStreak === 1 ? 'DORYA!' : 'DORYA COMBO!'}
            </motion.div>
          )}
          {/* Max streak display for DORYA_STREAK mode */}
          {mode === 'DORYA_STREAK' && state.maxStreak > 0 && (
            <motion.div 
              className="mt-2 font-tekken text-sm tracking-wider text-tekken-gold/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              BEST: {state.maxStreak}
            </motion.div>
          )}
        </div>

        {/* Right side - Stats and controls */}
        <div className="text-right space-y-2">
          <div className="flex items-center justify-end gap-3">
            <button
              className="font-tekken text-sm tracking-wider text-gray-500 hover:text-white transition-colors"
              onClick={onPause}
            >
              PAUSE [ESC]
            </button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2">
              <span className="font-tekken text-xs text-gray-600">PERFECT</span>
              <span className="font-display text-xl text-tekken-gold">{state.perfectCount}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="font-tekken text-xs text-gray-600">GOOD</span>
              <span className="font-display text-xl text-electric-blue">{state.goodCount}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="font-tekken text-xs text-gray-600">MISS</span>
              <span className="font-display text-xl text-tekken-red">{state.missCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grade popup */}
      <AnimatePresence>
        {state.lastAttempt && (
          <motion.div
            key={state.lastAttempt.timestamp}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className={`
              font-display text-8xl
              ${state.lastAttempt.result === 'perfect' ? 'text-tekken-gold electric-text-gold' : ''}
              ${state.lastAttempt.result === 'good' ? 'text-electric-blue electric-text' : ''}
              ${state.lastAttempt.result === 'bad' ? 'text-yellow-500' : ''}
              ${state.lastAttempt.result === 'miss' ? 'text-tekken-red' : ''}
            `}>
              {state.lastAttempt.result === 'perfect' && 'PERFECT!'}
              {state.lastAttempt.result === 'good' && 'GOOD!'}
              {state.lastAttempt.result === 'bad' && 'OK'}
              {state.lastAttempt.result === 'miss' && 'MISS'}
            </div>
            {state.lastAttempt.result !== 'miss' && (
              <div className="text-center font-tekken text-sm text-gray-400">
                {state.lastAttempt.timing}f timing
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom - Input display (hidden on mobile/touch devices - touch controls shown instead) */}
      <div className="absolute bottom-4 right-4 flex gap-2 items-end pointer-events-none hidden lg:flex">
        {/* Controller indicator */}
        {controllerConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 mr-3 px-2 py-1 rounded bg-black/50 border border-green-500/50"
          >
            <svg 
              className="w-4 h-4 text-green-400" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            <span className="text-[10px] font-tekken text-green-400 tracking-wider">CONTROLLER</span>
          </motion.div>
        )}
        
        {/* Direction keys - Backward, Down, and Forward */}
        <div className="flex gap-1">
          {/* Backward key - highlighted on P2 side as it becomes forward */}
          <div className={`
            w-10 h-10 rounded border-2 flex flex-col items-center justify-center font-mono text-xs
            ${isKeyActive(keybindings.backward || 'KeyA') 
              ? playerSide === 'p2'
                ? 'border-electric-blue bg-electric-blue/30 text-electric-blue'
                : 'border-gray-500 bg-gray-500/30 text-gray-400'
              : 'border-gray-700 bg-black/50 text-gray-600'}
          `}>
            <span>{getKeyDisplayName(keybindings.backward || 'KeyA')}</span>
            {playerSide === 'p2' && <span className="text-[8px] opacity-70">FWD</span>}
          </div>
          <div className={`
            w-10 h-10 rounded border-2 flex items-center justify-center font-mono text-sm
            ${isKeyActive(keybindings.down) 
              ? 'border-electric-purple bg-electric-purple/30 text-electric-purple' 
              : 'border-gray-700 bg-black/50 text-gray-600'}
          `}>
            {getKeyDisplayName(keybindings.down)}
          </div>
          {/* Forward key - highlighted on P1 side */}
          <div className={`
            w-10 h-10 rounded border-2 flex flex-col items-center justify-center font-mono text-xs
            ${isKeyActive(keybindings.forward) 
              ? playerSide === 'p1'
                ? 'border-electric-blue bg-electric-blue/30 text-electric-blue'
                : 'border-gray-500 bg-gray-500/30 text-gray-400'
              : 'border-gray-700 bg-black/50 text-gray-600'}
          `}>
            <span>{getKeyDisplayName(keybindings.forward)}</span>
            {playerSide === 'p1' && <span className="text-[8px] opacity-70">FWD</span>}
          </div>
        </div>

        {/* Attack button */}
        <div className={`
          w-12 h-12 rounded-full border-2 flex items-center justify-center font-tekken text-lg
          ${isKeyActive(keybindings.punch) 
            ? 'border-tekken-gold bg-tekken-gold/30 text-tekken-gold shadow-[0_0_20px_rgba(255,215,0,0.5)]' 
            : 'border-gray-700 bg-black/50 text-gray-600'}
        `}>
          {getKeyDisplayName(keybindings.punch)}
        </div>
      </div>
    </div>
  )
}

