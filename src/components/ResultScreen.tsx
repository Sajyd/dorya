'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GameMode, GameState } from '@/types/game'
import { useUser } from '@/context/UserContext'

interface ResultScreenProps {
  mode: GameMode
  state: GameState
  onPlayAgain: () => void
  onQuit: () => void
  coinsEarned?: number
}

const modeLabels: Record<GameMode, string> = {
  DORYA_STREAK: 'DORYA STREAK',
  PEWGF_MINUTE: 'PEWGF RUSH',
  SURVIVAL: 'SURVIVAL',
  FREESTYLE: 'FREESTYLE',
}

export default function ResultScreen({ mode, state, onPlayAgain, onQuit, coinsEarned = 0 }: ResultScreenProps) {
  const { user } = useUser()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

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

  const score = mode === 'DORYA_STREAK' ? state.maxStreak : 
                mode === 'PEWGF_MINUTE' ? state.perfectCount :
                mode === 'SURVIVAL' ? state.elapsedTime : 
                state.totalDoryas

  // Auto-submit score for ranked modes
  useEffect(() => {
    if (mode !== 'FREESTYLE' && !submitted && !submitting && user?.username) {
      submitScore()
    }
  }, [mode, user?.username])

  const submitScore = async () => {
    if (!user?.username || mode === 'FREESTYLE') return
    
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/ladder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          mode,
          score,
          perfectInputs: state.perfectCount,
          goodInputs: state.goodCount,
          missedInputs: state.missCount,
          maxCombo: state.maxStreak,
          duration: state.elapsedTime,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit score')
      }

      const data = await response.json()
      setRank(data.rank)
      setSubmitted(true)
    } catch {
      setError('Failed to submit score')
    } finally {
      setSubmitting(false)
    }
  }

  // Get grade based on performance
  const getGrade = () => {
    const perfectRate = state.perfectCount / Math.max(state.totalDoryas + state.missCount, 1)
    
    if (perfectRate >= 0.9 && state.totalDoryas >= 10) return { grade: 'S', color: 'text-tekken-gold' }
    if (perfectRate >= 0.7 && state.totalDoryas >= 5) return { grade: 'A', color: 'text-electric-blue' }
    if (perfectRate >= 0.5) return { grade: 'B', color: 'text-green-500' }
    if (perfectRate >= 0.3) return { grade: 'C', color: 'text-yellow-500' }
    return { grade: 'D', color: 'text-tekken-red' }
  }

  const { grade, color } = getGrade()

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div 
        className="text-center max-w-lg mx-auto px-4 md:px-8"
        style={{ 
          transform: isMobile ? 'scale(0.5)' : 'scale(1)',
          transformOrigin: 'center center'
        }}
      >
        {/* Player name */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-2 md:mb-4"
        >
          <span className="font-tekken text-sm md:text-lg tracking-wider text-tekken-gold">
            {user?.username}
          </span>
        </motion.div>

        {/* Grade */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className={`font-display text-[6rem] md:text-[12rem] leading-none ${color}`}
          style={{
            textShadow: grade === 'S' 
              ? '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)'
              : undefined
          }}
        >
          {grade}
        </motion.div>

        {/* Title */}
        <motion.h2
          className="font-display text-2xl md:text-4xl text-white mb-1 md:mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {modeLabels[mode]}
        </motion.h2>

        {/* Score */}
        <motion.div
          className="font-display text-4xl md:text-6xl text-electric-blue mb-4 md:mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.5 }}
        >
          {score}
          <span className="text-base md:text-2xl text-gray-500 ml-1 md:ml-2">
            {mode === 'DORYA_STREAK' && 'MAX STREAK'}
            {mode === 'PEWGF_MINUTE' && 'PEWGFS'}
            {mode === 'SURVIVAL' && 'SECONDS'}
            {mode === 'FREESTYLE' && 'DORYAS'}
          </span>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl text-tekken-gold">{state.perfectCount}</div>
            <div className="font-tekken text-[10px] md:text-xs text-gray-500 tracking-wider">PERFECT</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl text-electric-blue">{state.goodCount}</div>
            <div className="font-tekken text-[10px] md:text-xs text-gray-500 tracking-wider">GOOD</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl text-tekken-red">{state.missCount}</div>
            <div className="font-tekken text-[10px] md:text-xs text-gray-500 tracking-wider">MISS</div>
          </div>
        </motion.div>
        
        {/* Coins Earned */}
        {coinsEarned > 0 && (
          <motion.div
            className="mb-4 md:mb-6 flex items-center justify-center gap-2"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.7 }}
          >
            <div className="flex items-center gap-1.5 md:gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 md:px-6 md:py-3 rounded-xl border border-yellow-500/40">
              <span className="inline-block w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
              <span className="font-display text-2xl md:text-3xl text-yellow-400">+{coinsEarned}</span>
              <span className="font-tekken text-xs md:text-sm text-yellow-500/70 tracking-wider">DORYA COINS</span>
            </div>
          </motion.div>
        )}

        {/* Leaderboard submission status */}
        {mode !== 'FREESTYLE' && (
          <motion.div
            className="mb-4 md:mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75 }}
          >
            {submitting && (
              <div className="text-electric-blue font-tekken text-xs md:text-base tracking-wider animate-pulse">
                SUBMITTING TO LEADERBOARD...
              </div>
            )}
            {submitted && rank && (
              <div className="flex flex-col items-center gap-1">
                <div className="text-tekken-gold font-tekken text-xs md:text-base tracking-wider">
                  ⚡ SCORE SUBMITTED! ⚡
                </div>
                <div className="text-gray-400 font-tekken text-xs md:text-sm">
                  RANK #{rank}
                </div>
              </div>
            )}
            {submitted && !rank && (
              <div className="text-tekken-gold font-tekken text-xs md:text-base tracking-wider">
                ⚡ SCORE SUBMITTED! ⚡
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-tekken-red text-xs md:text-sm">{error}</p>
                <button
                  onClick={submitScore}
                  className="text-electric-blue text-xs md:text-sm font-tekken tracking-wider hover:text-white transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="flex justify-center gap-2 md:gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button
            className="menu-button text-sm md:text-base px-4 md:px-6 py-2 md:py-3 text-tekken-gold border-tekken-gold hover:bg-tekken-gold hover:text-black"
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </button>
          <button
            className="menu-button text-sm md:text-base px-4 md:px-6 py-2 md:py-3"
            onClick={onQuit}
          >
            QUIT
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
