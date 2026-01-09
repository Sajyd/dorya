'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CommandInput, DoryaAttempt } from '@/types/game'

interface CommandHistoryProps {
  inputs: CommandInput[]
  lastAttempt: DoryaAttempt | null
}

const directionSymbols: Record<string, string> = {
  'f': '→',
  'd': '↓',
  'df': '↘',
  'n': '○',
}

const directionColors: Record<string, string> = {
  'f': 'text-electric-blue',
  'd': 'text-electric-purple',
  'df': 'text-tekken-gold',
  'n': 'text-gray-500',
}

const FRAME_MS = 1000 / 60 // ~16.67ms per frame

export default function CommandHistory({ inputs, lastAttempt }: CommandHistoryProps) {
  // Show last 8 inputs on desktop, 5 on mobile
  const displayInputs = inputs.slice(-8)
  
  // Live frame counter for the current neutral state
  const [liveFrameCount, setLiveFrameCount] = useState(0)
  
  // Get the last input to check if we're in neutral
  const lastInput = inputs[inputs.length - 1]
  const isInNeutral = lastInput?.direction === 'n'
  
  // Calculate frame counts for each input (frames since last non-neutral input)
  const frameCountsForInputs = useMemo(() => {
    const counts: number[] = []
    let lastNonNeutralFrame: number | null = null
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      
      if (input.direction === 'n') {
        // For neutral inputs, show frames since last non-neutral
        if (lastNonNeutralFrame !== null) {
          counts.push(input.frame - lastNonNeutralFrame)
        } else {
          counts.push(0)
        }
      } else {
        // For non-neutral inputs, show frames since previous non-neutral (or 0 if first)
        if (lastNonNeutralFrame !== null) {
          counts.push(input.frame - lastNonNeutralFrame)
        } else {
          counts.push(0)
        }
        lastNonNeutralFrame = input.frame
      }
    }
    
    return counts
  }, [inputs])
  
  // Get frame counts only for displayed inputs
  const displayFrameCounts = frameCountsForInputs.slice(-8)
  
  // Live counter effect - ticks while in neutral
  useEffect(() => {
    if (!isInNeutral || !lastInput) {
      setLiveFrameCount(0)
      return
    }
    
    // Find the last non-neutral input to calculate initial count
    let lastNonNeutralFrame: number | null = null
    for (let i = inputs.length - 1; i >= 0; i--) {
      if (inputs[i].direction !== 'n') {
        lastNonNeutralFrame = inputs[i].frame
        break
      }
    }
    
    if (lastNonNeutralFrame === null) {
      setLiveFrameCount(0)
      return
    }
    
    // Start the live counter
    const startFrame = lastNonNeutralFrame
    
    const updateCounter = () => {
      const currentFrame = Math.floor(performance.now() / FRAME_MS)
      setLiveFrameCount(currentFrame - startFrame)
    }
    
    updateCounter() // Initial update
    const intervalId = setInterval(updateCounter, FRAME_MS)
    
    return () => clearInterval(intervalId)
  }, [isInNeutral, lastInput, inputs])

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
            const isNeutralAndLast = isLastInput && input.direction === 'n'
            const frameCount = isNeutralAndLast ? liveFrameCount : displayFrameCounts[index]
            
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
                  ${input.direction === 'n' ? 'text-gray-600' : 'text-cyan-400'}
                  ${isNeutralAndLast ? 'animate-pulse' : ''}
                `}>
                  {frameCount > 0 ? `${frameCount}f` : ''}
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
          <span className="text-electric-blue">→</span>
          <span className="text-gray-500">○</span>
          <span className="text-electric-purple">↓</span>
          <span className="text-tekken-gold">↘+2</span>
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

