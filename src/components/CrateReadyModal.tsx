'use client'

import { motion } from 'framer-motion'
import { CrateType } from '@/types/game'
import { LOOT_CRATES } from '@/lib/customizationData'

interface CrateReadyModalProps {
  crateType: CrateType
  crateId: string
  onOpen: () => void
  onClose: () => void
}

export default function CrateReadyModal({ crateType, crateId, onOpen, onClose }: CrateReadyModalProps) {
  const crate = LOOT_CRATES.find(c => c.id === crateType)!

  const crateColors = {
    basic: { primary: '#6b7280', secondary: '#374151', glow: 'rgba(107, 114, 128, 0.5)' },
    premium: { primary: '#a855f7', secondary: '#7c3aed', glow: 'rgba(168, 85, 247, 0.6)' },
    legendary: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)' },
  }

  const colors = crateColors[crateType]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 max-w-md w-full mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Outer glow */}
        <div
          className="absolute -inset-4 rounded-3xl opacity-50"
          style={{ background: `radial-gradient(ellipse at center, ${colors.glow}, transparent 70%)` }}
        />

        {/* Card */}
        <div
          className="relative rounded-2xl border-2 overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom, #1a1a2e, #0a0a12)',
            borderColor: colors.primary,
            boxShadow: `0 0 60px ${colors.glow}`,
          }}
        >
          {/* Header decoration */}
          <div
            className="h-2"
            style={{ background: `linear-gradient(to right, ${colors.secondary}, ${colors.primary}, ${colors.secondary})` }}
          />

          <div className="p-8">
            {/* Success checkmark */}
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)`,
                border: `3px solid ${colors.primary}`,
                boxShadow: `0 0 30px ${colors.glow}`,
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <motion.span
                className="text-4xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                ✓
              </motion.span>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="font-display text-3xl text-center mb-2"
              style={{ color: colors.primary }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              PURCHASE COMPLETE!
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="text-gray-400 text-center mb-6 font-tekken"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Your {crate.name} is ready to open!
            </motion.p>

            {/* Crate preview */}
            <motion.div
              className="relative w-32 h-32 mx-auto mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {/* Floating animation */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Crate glow */}
                <div
                  className="absolute -inset-4 rounded-2xl"
                  style={{ background: `radial-gradient(circle, ${colors.glow}, transparent 60%)` }}
                />

                {/* Crate box */}
                <div
                  className="relative w-32 h-32 rounded-xl"
                  style={{
                    background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
                    boxShadow: `0 0 40px ${colors.glow}`,
                  }}
                >
                  {/* Lid */}
                  <div
                    className="absolute -top-3 left-2 right-2 h-6 rounded-t-lg"
                    style={{ background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})` }}
                  />

                  {/* Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">
                    {crateType === 'legendary' ? '🎁' : crateType === 'premium' ? '📦' : '📦'}
                  </div>

                  {/* Sparkles */}
                  {crateType !== 'basic' && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: colors.primary,
                            left: `${20 + Math.random() * 60}%`,
                            top: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.25,
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Crate info */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-white font-display text-xl" style={{ color: colors.primary }}>
                {crate.name}
              </p>
              <p className="text-gray-500 text-sm">
                Contains {crate.itemCount} item{crate.itemCount > 1 ? 's' : ''}
                {crate.guaranteedRarity && (
                  <span className="text-purple-400"> • Guaranteed {crate.guaranteedRarity}+</span>
                )}
              </p>
            </motion.div>

            {/* Buttons */}
            <div className="space-y-3">
              <motion.button
                className="w-full py-4 rounded-xl font-display text-xl tracking-wider relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  color: crateType === 'legendary' ? '#000' : '#fff',
                  boxShadow: `0 0 30px ${colors.glow}`,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpen}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
                <span className="relative z-10">OPEN NOW!</span>
              </motion.button>

              <motion.button
                className="w-full py-3 rounded-xl font-tekken tracking-wider text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-300 transition-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
              >
                SAVE FOR LATER
              </motion.button>
            </div>

            {/* Tip */}
            <motion.p
              className="text-center text-gray-600 text-xs mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              💡 You can open saved crates from your Locker
            </motion.p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}


