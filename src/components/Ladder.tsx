'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameMode, LadderEntry } from '@/types/game'
import { useUser } from '@/context/UserContext'

interface LadderProps {
  onBack: () => void
}

const modeLabels: Record<GameMode, string> = {
  DORYA_STREAK: 'DORYA STREAK',
  PEWGF_MINUTE: 'PEWGF RUSH',
  SURVIVAL: 'SURVIVAL',
  FREESTYLE: 'FREESTYLE',
}

const modeDescriptions: Record<GameMode, string> = {
  DORYA_STREAK: 'Consecutive perfect electrics',
  PEWGF_MINUTE: 'PEWGFs in 60 seconds',
  SURVIVAL: 'Seconds survived',
  FREESTYLE: 'Practice mode - no rankings',
}

export default function Ladder({ onBack }: LadderProps) {
  const { user } = useUser()
  const [selectedMode, setSelectedMode] = useState<GameMode>('DORYA_STREAK')
  const [entries, setEntries] = useState<LadderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLadder(selectedMode)
  }, [selectedMode])

  const fetchLadder = async (mode: GameMode) => {
    if (mode === 'FREESTYLE') {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ladder?mode=${mode}`)
      if (!response.ok) throw new Error('Failed to fetch ladder')
      const data = await response.json()
      setEntries(data.entries || [])
    } catch {
      setError('Could not load leaderboard')
      // Show demo data if API fails
      setEntries([
        { id: '1', rank: 1, username: 'KAZUYA_MISHIMA', score: 47, mode, createdAt: new Date().toISOString() },
        { id: '2', rank: 2, username: 'DEVIL_JIN', score: 42, mode, createdAt: new Date().toISOString() },
        { id: '3', rank: 3, username: 'HEIHACHI', score: 38, mode, createdAt: new Date().toISOString() },
        { id: '4', rank: 4, username: 'LARS_ALEX', score: 35, mode, createdAt: new Date().toISOString() },
        { id: '5', rank: 5, username: 'KNEE_GOD', score: 33, mode, createdAt: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const rankModes: GameMode[] = ['DORYA_STREAK', 'PEWGF_MINUTE', 'SURVIVAL']

  // Check if an entry belongs to the current user
  const isCurrentUser = (username: string) => {
    return user?.username?.toUpperCase() === username.toUpperCase()
  }

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      
      {/* Grid */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(157, 78, 221, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(157, 78, 221, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Back button - fixed position */}
      <motion.button
        className="fixed top-8 left-8 z-20 text-electric-blue font-tekken text-lg tracking-wider flex items-center gap-2 hover:text-white transition-colors"
        onClick={onBack}
        whileHover={{ x: -5 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        ← BACK
      </motion.button>

      {/* Scrollable content */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-8 py-20 min-h-full flex flex-col">
          {/* Title */}
          <motion.h1 
            className="font-display text-7xl text-center mb-8 text-white"
            style={{ textShadow: '0 0 30px rgba(157, 78, 221, 0.8), 0 0 60px rgba(157, 78, 221, 0.4)' }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            LADDER
          </motion.h1>

        {/* Mode selector */}
        <motion.div 
          className="flex justify-center gap-4 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {rankModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`
                px-6 py-3 font-tekken text-sm tracking-wider transition-all duration-300
                border-2 rounded-sm
                ${selectedMode === mode
                  ? 'border-electric-purple bg-electric-purple/20 text-white shadow-[0_0_20px_rgba(157,78,221,0.4)]'
                  : 'border-gray-700 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-300'
                }
              `}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </motion.div>

        {/* Mode description */}
        <motion.p 
          className="text-center text-gray-500 mb-6 font-sans"
          key={selectedMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {modeDescriptions[selectedMode]}
        </motion.p>

        {/* Leaderboard */}
        <motion.div 
          className="flex-1 bg-black/50 border border-gray-800 rounded-lg overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-900/50 border-b border-gray-800 font-tekken text-sm tracking-wider text-gray-500">
            <div className="col-span-2">RANK</div>
            <div className="col-span-6">PLAYER</div>
            <div className="col-span-2 text-right">SCORE</div>
            <div className="col-span-2 text-right">DATE</div>
          </div>

          {/* Entries */}
          <div className="overflow-y-auto max-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  className="flex items-center justify-center py-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="loading-dorya text-4xl text-electric-blue">
                    LOADING...
                  </div>
                </motion.div>
              ) : entries.length === 0 ? (
                <motion.div 
                  className="flex flex-col items-center justify-center py-20 text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="font-tekken text-xl tracking-wider mb-2">NO RECORDS YET</p>
                  <p className="text-sm font-sans">Be the first to set a record!</p>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {entries.map((entry, index) => {
                    const isMe = isCurrentUser(entry.username)
                    return (
                      <motion.div
                        key={entry.id}
                        className={`
                          grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/50
                          transition-colors relative
                          ${isMe 
                            ? 'bg-tekken-gold/10 hover:bg-tekken-gold/20' 
                            : 'hover:bg-gray-900/30'
                          }
                          ${index < 3 && !isMe ? 'bg-gradient-to-r from-transparent' : ''}
                          ${index === 0 && !isMe ? 'to-tekken-gold/10' : ''}
                          ${index === 1 && !isMe ? 'to-gray-400/10' : ''}
                          ${index === 2 && !isMe ? 'to-amber-700/10' : ''}
                        `}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* "YOU" indicator */}
                        {isMe && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-tekken-gold" />
                        )}
                        <div className="col-span-2 flex items-center">
                          <span className={`
                            font-display text-2xl
                            ${isMe ? 'text-tekken-gold' : ''}
                            ${!isMe && index === 0 ? 'text-tekken-gold' : ''}
                            ${!isMe && index === 1 ? 'text-gray-300' : ''}
                            ${!isMe && index === 2 ? 'text-amber-600' : ''}
                            ${!isMe && index >= 3 ? 'text-gray-500' : ''}
                          `}>
                            #{entry.rank}
                          </span>
                        </div>
                        <div className="col-span-6 flex items-center gap-2">
                          <span className={`
                            font-tekken tracking-wider
                            ${isMe ? 'text-tekken-gold' : index < 3 ? 'text-white' : 'text-gray-400'}
                          `}>
                            {entry.username}
                          </span>
                          {isMe && (
                            <span className="px-2 py-0.5 text-[10px] font-tekken tracking-wider bg-tekken-gold/20 text-tekken-gold rounded border border-tekken-gold/40">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <span className={`
                            font-display text-2xl
                            ${isMe ? 'text-tekken-gold electric-text-gold' : ''}
                            ${!isMe && index === 0 ? 'text-tekken-gold electric-text-gold' : ''}
                            ${!isMe && index !== 0 ? 'text-electric-blue' : ''}
                          `}>
                            {entry.score}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end text-gray-600 text-sm font-sans">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

          {error && (
            <p className="text-center text-yellow-500 mt-4 text-sm font-sans">
              {error} - Showing demo data
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
