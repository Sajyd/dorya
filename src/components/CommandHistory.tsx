'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CommandInput, DoryaAttempt } from '@/types/game'

interface CommandHistoryProps {
  inputs: CommandInput[]
  lastAttempt: DoryaAttempt | null
  playerSide?: 'p1' | 'p2'
}

// Direction symbols for P1 side (player on left, facing right)
const directionSymbolsP1: Record<string, string> = {
  'f': '→',
  'd': '↓',
  'df': '↘',
  'n': '○',
}

// Direction symbols for P2 side (player on right, facing left)
// Forward becomes backward visually since player faces the other direction
const directionSymbolsP2: Record<string, string> = {
  'f': '←',
  'd': '↓',
  'df': '↙',
  'n': '○',
}

const directionColors: Record<string, string> = {
  'f': 'text-electric-blue',
  'd': 'text-electric-purple',
  'df': 'text-tekken-gold',
  'n': 'text-gray-500',
}

const FRAME_MS = 1000 / 60 // ~16.67ms per frame
const COUNTER_UPDATE_INTERVAL = 100 // Update live counter at 10fps instead of 60fps

export default function CommandHistory({ inputs, lastAttempt, playerSide = 'p1' }: CommandHistoryProps) {
  // Show last 8 inputs on desktop, 5 on mobile
  const displayInputs = inputs.slice(-8)
  
  // Use correct direction symbols based on player side
  const directionSymbols = playerSide === 'p2' ? directionSymbolsP2 : directionSymbolsP1
  
  // Live frame counter for the current neutral state
  const [liveFrameCount, setLiveFrameCount] = useState(0)
  
  // Get the last input for live counter
  const lastInput = inputs[inputs.length - 1]
  
  // Calculate frame counts for each input (how long each input was held)
  const frameCountsForInputs = useMemo(() => {
    const counts: number[] = []
    
    for (let i = 0; i < inputs.length; i++) {
      if (i < inputs.length - 1) {
        // Duration = when next input started - when this input started
        const duration = inputs[i + 1].frame - inputs[i].frame
        counts.push(Math.max(1, duration))
      } else {
        // Last input - will use live counter if neutral, otherwise show 1
        counts.push(1)
      }
    }
    
    return counts
  }, [inputs])
  
  // Get frame counts only for displayed inputs
  const displayFrameCounts = frameCountsForInputs.slice(-8)
  
  // Live counter effect - ticks for the last input to show how long it's been held
  // Reduced from 60fps to 10fps updates to prevent performance issues
  useEffect(() => {
    if (!lastInput) {
      setLiveFrameCount(1)
      return
    }
    
    // Start counting from the last input's frame
    const startFrame = lastInput.frame
    
    const updateCounter = () => {
      const currentFrame = Math.floor(performance.now() / FRAME_MS)
      const diff = currentFrame - startFrame
      setLiveFrameCount(Math.max(1, diff))
    }
    
    updateCounter() // Initial update
    const intervalId = setInterval(updateCounter, COUNTER_UPDATE_INTERVAL)
    
    return () => clearInterval(intervalId)
  }, [lastInput])

  return (
    <div className="bg-black/70 border border-gray-800 rounded-lg p-2 md:p-4 min-w-[140px] md:min-w-[200px]">
      <div className="font-tekken text-[10px] md:text-xs tracking-widest text-gray-500 mb-2 md:mb-3">
        COMMAND HISTORY
      </div>

      {/* Input sequence */}
      <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
        <AnimatePresence mode="popLayout">
          {displayInputs.map((input, index) => {
            const isLastInput = index === displayInputs.length - 1
            // Last input always uses live counter (shows how long currently held)
            const frameCount = isLastInput ? liveFrameCount : displayFrameCounts[index]
            
            return (
              <motion.div
                key={`${input.timestamp}-${index}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="flex flex-col items-center"
              >
                {/* Frame counter above input */}
                <span className={`
                  font-mono text-[8px] md:text-[10px] mb-0.5
                  ${directionColors[input.direction] || 'text-gray-400'}
                  ${isLastInput ? 'animate-pulse' : ''}
                `}>
                  {frameCount}f
                </span>
                
                {/* Input box */}
                <div className={`
                  flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded
                  border border-gray-700 bg-gray-900/50
                  ${input.button === '2' ? 'border-tekken-gold' : ''}
                `}>
                  <span className={`font-mono text-sm md:text-lg ${directionColors[input.direction] || 'text-gray-400'}`}>
                    {directionSymbols[input.direction] || input.direction}
                  </span>
                  {input.button === '2' && (
                    <span className="text-tekken-gold font-bold text-xs md:text-base">+2</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {displayInputs.length === 0 && (
          <span className="text-gray-600 text-[10px] md:text-sm font-mono">Waiting for input...</span>
        )}
      </div>

      {/* EWGF notation reference */}
      <div className="border-t border-gray-800 pt-2 md:pt-3">
        <div className="text-[10px] md:text-xs text-gray-600 mb-1 md:mb-2">EWGF NOTATION:</div>
        <div className="flex items-center gap-0.5 md:gap-1 text-xs md:text-sm">
          <span className="text-electric-blue">{directionSymbols['f']}</span>
          <span className="text-gray-500">{directionSymbols['n']}</span>
          <span className="text-electric-purple">{directionSymbols['d']}</span>
          <span className="text-tekken-gold">{directionSymbols['df']}+2</span>
        </div>
        <div className="text-[10px] md:text-xs text-gray-700 mt-0.5 md:mt-1">
          (f, n, d, df+2)
        </div>
      </div>

      {/* Timing info */}
      <AnimatePresence>
        {lastAttempt && lastAttempt.result !== 'miss' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-800 pt-2 md:pt-3 mt-2 md:mt-3"
          >
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">TIMING:</div>
            <div className={`
              font-mono text-sm md:text-lg
              ${lastAttempt.result === 'perfect' ? 'text-tekken-gold' : ''}
              ${lastAttempt.result === 'good' ? 'text-electric-blue' : ''}
              ${lastAttempt.result === 'bad' ? 'text-yellow-500' : ''}
            `}>
              {lastAttempt.timing}f from D to DF+2
            </div>
            <div className="text-[10px] md:text-xs text-gray-600 mt-0.5 md:mt-1">
              {lastAttempt.timing <= 1 && '⚡ Just frame!'}
              {lastAttempt.timing === 2 && 'Almost there!'}
              {lastAttempt.timing === 3 && 'Good, but can be tighter'}
              {lastAttempt.timing > 3 && 'Too slow - speed up!'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

