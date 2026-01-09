'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { CrateType, ShopItem, ItemRarity } from '@/types/game'
import { LOOT_CRATES, RARITY_COLORS, RARITY_GLOW } from '@/lib/customizationData'

interface LootCrateOpeningProps {
  crateType: CrateType
  onComplete: () => void
  // Optional: if items are provided, show reveal phase
  items?: Array<{
    id: string
    name: string
    category: string
    rarity: ItemRarity
    isNew?: boolean
    primaryColor?: string
    secondaryColor?: string
    skinColor?: string
    clothColor?: string
    glowColor?: string
    floorColor?: string
    gridColor?: string
    accentColor?: string
    preview?: string
  }>
  onClaim?: () => void
}

type Phase = 'intro' | 'shake' | 'burst' | 'reveal' | 'done'

export default function LootCrateOpening({ crateType, onComplete, items, onClaim }: LootCrateOpeningProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [revealedItems, setRevealedItems] = useState<number[]>([])
  const [allRevealed, setAllRevealed] = useState(false)
  const crate = LOOT_CRATES.find(c => c.id === crateType)!

  const crateColors = {
    basic: { primary: '#6b7280', secondary: '#374151', glow: 'rgba(107, 114, 128, 0.5)' },
    premium: { primary: '#a855f7', secondary: '#7c3aed', glow: 'rgba(168, 85, 247, 0.6)' },
    legendary: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)' },
  }

  const colors = crateColors[crateType]

  useEffect(() => {
    if (phase === 'done' && !items) {
      onComplete()
    }
  }, [phase, items, onComplete])

  useEffect(() => {
    // Animation sequence
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setPhase('shake'), 800))
    timers.push(setTimeout(() => setPhase('burst'), 2500))
    timers.push(setTimeout(() => {
      if (items && items.length > 0) {
        setPhase('reveal')
      } else {
      setPhase('done')
      onComplete()
      }
    }, 3500))

    return () => timers.forEach(clearTimeout)
  }, [items, onComplete])

  // Reveal items one by one
  useEffect(() => {
    if (phase === 'reveal' && items) {
      const revealTimer = setInterval(() => {
        setRevealedItems(prev => {
          const next = [...prev, prev.length]
          if (next.length >= items.length) {
            clearInterval(revealTimer)
            setTimeout(() => setAllRevealed(true), 500)
          }
          return next
        })
      }, 400)
      return () => clearInterval(revealTimer)
    }
  }, [phase, items])

  const handleClaim = useCallback(() => {
    if (onClaim) {
      onClaim()
    }
    setPhase('done')
    onComplete()
  }, [onClaim, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colors.glow} 0%, transparent 50%)`,
        }}
        animate={{
            scale: phase === 'shake' ? [1, 1.3, 1] : phase === 'burst' ? [1, 4] : phase === 'reveal' ? 2 : 1,
            opacity: phase === 'burst' ? [1, 0] : phase === 'reveal' ? 0.3 : 1,
          }}
          transition={{ duration: phase === 'shake' ? 0.15 : 1, repeat: phase === 'shake' ? Infinity : 0 }}
        />

        {/* Star field for reveal phase */}
        {phase === 'reveal' && (
          <>
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-1 h-1 rounded-full bg-white"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Energy particles */}
      <AnimatePresence>
        {(phase === 'shake' || phase === 'burst') && (
          <>
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ 
                  backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary,
                  width: 4 + Math.random() * 8,
                  height: 4 + Math.random() * 8,
                  filter: 'blur(1px)',
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * (phase === 'burst' ? 1000 : 150),
                  y: (Math.random() - 0.5) * (phase === 'burst' ? 1000 : 150),
                  opacity: phase === 'burst' ? [1, 0] : [0, 1, 0],
                  scale: phase === 'burst' ? [1, 0] : [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: phase === 'burst' ? 1.2 : 0.4,
                  delay: i * 0.015,
                  repeat: phase === 'shake' ? Infinity : 0,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Electric arcs during shake */}
      <AnimatePresence>
        {phase === 'shake' && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`arc-${i}`}
                className="absolute origin-center"
                style={{
                  width: 3,
                  height: 80 + Math.random() * 120,
                  background: `linear-gradient(to bottom, ${colors.primary}, transparent)`,
                  left: '50%',
                  top: '50%',
                  transformOrigin: 'top center',
                }}
                initial={{ rotate: i * 45, opacity: 0, scaleY: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scaleY: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.08,
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* The Crate */}
      <AnimatePresence>
        {phase !== 'reveal' && phase !== 'done' && (
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, rotateY: -180, rotateX: 20 }}
            animate={{
              scale: phase === 'burst' ? [1, 1.8, 0] : 1,
              rotateY: 0,
              rotateX: 0,
              x: phase === 'shake' ? [0, -15, 15, -15, 15, 0] : 0,
              y: phase === 'shake' ? [0, -8, 8, -8, 8, 0] : 0,
              rotate: phase === 'shake' ? [0, -4, 4, -4, 4, 0] : 0,
            }}
            transition={{
              scale: { duration: 0.6, ease: 'easeOut' },
              rotateY: { duration: 0.6, type: 'spring', stiffness: 100 },
              rotateX: { duration: 0.6 },
              x: { duration: 0.08, repeat: phase === 'shake' ? Infinity : 0 },
              y: { duration: 0.08, repeat: phase === 'shake' ? Infinity : 0 },
              rotate: { duration: 0.08, repeat: phase === 'shake' ? Infinity : 0 },
            }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
          >
            {/* Crate outer glow */}
            <motion.div
              className="absolute -inset-8 rounded-3xl"
              style={{
                background: `radial-gradient(ellipse at center, ${colors.glow}, transparent 70%)`,
              }}
              animate={{
                scale: phase === 'shake' ? [1, 1.2, 1] : 1,
                opacity: phase === 'shake' ? [0.5, 1, 0.5] : 0.5,
              }}
              transition={{ duration: 0.2, repeat: phase === 'shake' ? Infinity : 0 }}
            />

            {/* Crate body */}
            <div
              className="w-48 h-48 rounded-2xl relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `
                  0 0 80px ${colors.glow},
                  inset 0 2px 20px rgba(255,255,255,0.2),
                  inset 0 -2px 20px rgba(0,0,0,0.3)
                `,
              }}
            >
              {/* Metal bands */}
              <div 
                className="absolute top-4 left-0 right-0 h-2"
                style={{ background: `linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(0,0,0,0.2))` }}
              />
              <div 
                className="absolute bottom-4 left-0 right-0 h-2"
                style={{ background: `linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(0,0,0,0.2))` }}
              />
              
              {/* Lid with 3D effect */}
              <motion.div
                className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-44 h-10 rounded-t-xl"
                style={{
                  background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
                  transformOrigin: 'bottom center',
                  boxShadow: `0 -4px 20px ${colors.glow}`,
                }}
                animate={{
                  rotateX: phase === 'burst' ? -140 : 0,
                  y: phase === 'burst' ? -30 : 0,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {/* Lid detail */}
                <div 
                  className="absolute inset-x-4 top-2 h-1 rounded"
                  style={{ background: 'rgba(255,255,255,0.3)' }}
                />
              </motion.div>

              {/* Center emblem */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${colors.primary}40, transparent)`,
                  border: `3px solid ${crateType === 'legendary' ? '#ffd700' : colors.primary}`,
                  boxShadow: `0 0 20px ${colors.glow}, inset 0 0 20px rgba(0,0,0,0.5)`,
                }}
                animate={{
                  scale: phase === 'shake' ? [1, 1.15, 1] : 1,
                  rotate: phase === 'shake' ? [0, 5, -5, 0] : 0,
                  opacity: phase === 'burst' ? 0 : 1,
                }}
                transition={{
                  scale: { duration: 0.15, repeat: phase === 'shake' ? Infinity : 0 },
                  rotate: { duration: 0.15, repeat: phase === 'shake' ? Infinity : 0 },
                  opacity: { duration: 0.2 },
                }}
              >
                <div className="absolute inset-3 flex items-center justify-center text-3xl">
                  {crateType === 'legendary' ? '⭐' : crateType === 'premium' ? '💎' : '📦'}
                </div>
              </motion.div>

              {/* Energy burst from inside */}
              {phase === 'burst' && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, white 0%, ${colors.primary} 30%, transparent 60%)`,
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 4] }}
                  transition={{ duration: 1 }}
                />
              )}
            </div>

            {/* Floating runes */}
            {phase === 'shake' && (
              <>
                {['✦', '✧', '⬡', '◈'].map((rune, i) => (
                  <motion.div
                    key={rune}
                    className="absolute text-2xl"
                    style={{ 
                      color: colors.primary,
                      textShadow: `0 0 10px ${colors.primary}`,
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: Math.cos(i * Math.PI / 2) * 100,
                      y: Math.sin(i * Math.PI / 2) * 100,
                      rotate: [0, 360],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  >
                    {rune}
                  </motion.div>
                ))}
              </>
            )}

            {/* Crate name */}
            <motion.p
              className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 font-display text-3xl whitespace-nowrap tracking-wider"
              style={{ 
                color: colors.primary,
                textShadow: `0 0 20px ${colors.glow}`,
              }}
              animate={{ opacity: phase === 'burst' ? 0 : 1 }}
            >
              {crate.name}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Reveal Phase */}
      <AnimatePresence>
        {phase === 'reveal' && items && (
          <motion.div
            className="relative z-10 flex flex-col items-center max-w-4xl w-full px-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <h2 
                className="font-display text-5xl mb-2"
                style={{ 
                  color: colors.primary,
                  textShadow: `0 0 30px ${colors.glow}`,
                }}
              >
                REWARDS UNLOCKED!
              </h2>
              <p className="text-gray-400 font-tekken tracking-wide">
                You received {items.length} item{items.length > 1 ? 's' : ''}
              </p>
            </motion.div>

            {/* Items Grid */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {items.map((item, index) => {
                const isRevealed = revealedItems.includes(index)
                const rarityColor = RARITY_COLORS[item.rarity]
                const rarityGlow = RARITY_GLOW[item.rarity]
                
                return (
                  <motion.div
                    key={item.id}
                    className="relative"
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={isRevealed ? { 
                      scale: 1, 
                      rotateY: 0,
                    } : {}}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 200,
                      damping: 15,
                    }}
                  >
                    {/* Card glow - muted for duplicates */}
                    <motion.div
                      className="absolute -inset-2 rounded-2xl"
                      style={{ background: item.isNew === false ? 'rgba(107, 114, 128, 0.2)' : rarityGlow }}
                      animate={isRevealed ? {
                        opacity: item.isNew === false ? [0.2, 0.4, 0.2] : [0.5, 1, 0.5],
                        scale: [1, 1.05, 1],
                      } : { opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Card */}
                    <div
                      className="relative w-36 p-4 rounded-xl border-2 bg-gray-900/90 backdrop-blur"
                      style={{
                        borderColor: item.isNew === false ? '#6b7280' : rarityColor,
                        boxShadow: item.isNew === false 
                          ? `0 0 15px rgba(107, 114, 128, 0.3), inset 0 0 20px rgba(0,0,0,0.5)` 
                          : `0 0 30px ${rarityGlow}, inset 0 0 20px rgba(0,0,0,0.5)`,
                      }}
                    >
                      {/* New badge */}
                      {item.isNew && (
                        <motion.div
                          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-500 text-xs font-tekken text-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                        >
                          NEW!
                        </motion.div>
                      )}
                      
                      {/* Duplicate badge */}
                      {item.isNew === false && (
                        <motion.div
                          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gray-600 text-xs font-tekken text-gray-300"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                        >
                          OWNED
                        </motion.div>
                      )}

                      {/* Rarity sparkles */}
                      {item.rarity === 'legendary' && isRevealed && (
                        <>
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={`sparkle-${i}`}
                              className="absolute w-1 h-1 rounded-full bg-yellow-400"
                              style={{
                                left: `${20 + Math.random() * 60}%`,
                                top: `${20 + Math.random() * 60}%`,
                              }}
                              animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1.5, 0],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </>
                      )}

                      {/* Item preview */}
                      <div className="aspect-square mb-3 rounded-lg bg-black/50 flex items-center justify-center overflow-hidden">
                        <ItemPreview item={item} />
                      </div>

                      {/* Rarity badge */}
                      <div
                        className="text-center text-xs font-tekken uppercase tracking-wider mb-1"
                        style={{ color: rarityColor }}
                      >
                        {item.rarity}
                      </div>

                      {/* Item name */}
                      <p className="text-white text-sm font-tekken text-center truncate">
                        {item.name}
                      </p>

                      {/* Category */}
                      <p className="text-gray-500 text-xs text-center capitalize">
                        {item.category.replace('_', ' ')}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Claim Button */}
            <motion.button
              className="relative overflow-hidden px-12 py-4 rounded-xl font-display text-2xl tracking-wider"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                boxShadow: `0 0 40px ${colors.glow}`,
                color: crateType === 'legendary' ? '#000' : '#fff',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: allRevealed ? 1 : 0, 
                y: allRevealed ? 0 : 20,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
            >
              {/* Button shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
              <span className="relative z-10">CLAIM REWARDS</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading text */}
      <motion.p
        className="absolute bottom-10 text-gray-500 font-tekken text-sm tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'intro' || phase === 'shake' ? 1 : 0 }}
      >
        {phase === 'intro' ? 'PREPARING...' : 'OPENING...'}
      </motion.p>
    </motion.div>
  )
}

// Item preview component for reveal cards
function ItemPreview({ item }: { item: {
  category: string
  primaryColor?: string
  secondaryColor?: string
  skinColor?: string
  clothColor?: string
  glowColor?: string
  floorColor?: string
  gridColor?: string
  accentColor?: string
  preview?: string
}}) {
  switch (item.category) {
    case 'stage':
      return (
        <div
          className="w-full h-full rounded-lg"
          style={{
            background: `linear-gradient(to bottom, ${item.accentColor}40, ${item.floorColor})`,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(${item.gridColor}40 1px, transparent 1px),
                linear-gradient(90deg, ${item.gridColor}40 1px, transparent 1px)
              `,
              backgroundSize: '8px 8px',
            }}
          />
        </div>
      )
    
    case 'electric_color':
      return (
        <motion.div
          className="w-12 h-12 rounded-full"
          style={{
            background: `radial-gradient(circle, ${item.primaryColor}, ${item.secondaryColor})`,
            boxShadow: `0 0 20px ${item.primaryColor}`,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )
    
    case 'character':
    case 'dummy':
      // Use preview image if available
      if (item.preview) {
        return (
          <div className="relative w-full h-full">
            <Image
              src={item.preview}
              alt="Item preview"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 80px, 120px"
            />
            {item.glowColor && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ boxShadow: `inset 0 0 20px ${item.glowColor}` }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
        )
      }
      // Fallback to silhouette
      return (
        <div className="relative">
          <div
            className="w-10 h-16 rounded-t-full"
            style={{ backgroundColor: item.skinColor }}
          />
          <div
            className="w-12 h-8 rounded-lg -mt-3"
            style={{ backgroundColor: item.clothColor }}
          />
          {item.glowColor && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ boxShadow: `0 0 15px ${item.glowColor}` }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      )
    
    default:
      return (
        <div className="text-4xl">🎁</div>
      )
  }
}
