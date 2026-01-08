'use client'

import { motion } from 'framer-motion'

interface HowToPlayProps {
  onBack: () => void
}

export default function HowToPlay({ onBack }: HowToPlayProps) {
  const inputSequence = [
    { key: 'F', label: 'Forward', color: 'text-electric-blue' },
    { key: 'N', label: 'Neutral', color: 'text-gray-400' },
    { key: 'D', label: 'Down', color: 'text-electric-purple' },
    { key: 'DF+2', label: 'Down-Forward + Right Punch', color: 'text-tekken-gold', isPerfect: true },
  ]

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
              linear-gradient(rgba(0, 212, 255, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.2) 1px, transparent 1px)
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
        <div className="max-w-4xl mx-auto px-8 py-20">
          {/* Title */}
          <motion.h1 
            className="font-display text-7xl text-center mb-12 electric-text"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            HOW TO DORYA
          </motion.h1>

        {/* Input sequence */}
        <motion.div 
          className="bg-black/50 border border-gray-800 rounded-lg p-8 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-tekken text-2xl text-white mb-6 tracking-wider">
            THE ELECTRIC WIND GOD FIST (EWGF)
          </h2>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            {inputSequence.map((input, index) => (
              <motion.div
                key={input.key}
                className="flex flex-col items-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.15, type: 'spring' }}
              >
                <div className={`
                  w-20 h-20 rounded-lg border-2 flex items-center justify-center
                  font-tekken text-2xl font-bold
                  ${input.isPerfect 
                    ? 'border-tekken-gold bg-tekken-gold/10 text-tekken-gold electric-text-gold' 
                    : 'border-gray-600 bg-gray-900'
                  }
                  ${input.color}
                `}>
                  {input.key}
                </div>
                <span className="text-sm text-gray-500 mt-2 font-sans text-center">
                  {input.label}
                </span>
                {index < inputSequence.length - 1 && (
                  <motion.span 
                    className="absolute translate-x-14 text-gray-600 text-2xl"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    →
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center text-gray-400 font-sans">
            <p className="mb-2">
              For a <span className="text-tekken-gold font-bold">PERFECT ELECTRIC (PEWGF)</span>, 
              you must input <span className="text-electric-blue">DF+2</span> on the exact frame after <span className="text-electric-purple">D</span>
            </p>
            <p className="text-sm text-gray-500">
              That's just 1 frame = ~16.67 milliseconds!
            </p>
          </div>
        </motion.div>

        {/* Keyboard controls */}
        <motion.div 
          className="bg-black/50 border border-gray-800 rounded-lg p-8 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-tekken text-2xl text-white mb-6 tracking-wider">
            KEYBOARD CONTROLS
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-electric-blue font-tekken tracking-wider">MOVEMENT</h3>
              <div className="space-y-2 font-mono">
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">W</kbd>
                  <span className="text-gray-400">Up</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">A</kbd>
                  <span className="text-gray-400">Back</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">S</kbd>
                  <span className="text-gray-400">Down</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">D</kbd>
                  <span className="text-gray-400">Forward</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-electric-purple font-tekken tracking-wider">ATTACKS</h3>
              <div className="space-y-2 font-mono">
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">J</kbd>
                  <span className="text-gray-400">1 - Left Punch</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-tekken-gold/20 rounded border border-tekken-gold text-tekken-gold">K</kbd>
                  <span className="text-tekken-gold">2 - Right Punch (for EWGF)</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">L</kbd>
                  <span className="text-gray-400">3 - Left Kick</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-3 py-1 bg-gray-800 rounded border border-gray-700">;</kbd>
                  <span className="text-gray-400">4 - Right Kick</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div 
          className="bg-black/50 border border-gray-800 rounded-lg p-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="font-tekken text-2xl text-white mb-6 tracking-wider">
            TIPS
          </h2>
          
          <ul className="space-y-3 text-gray-400 font-sans">
            <li className="flex items-start gap-3">
              <span className="text-electric-blue">⚡</span>
              <span>The key is speed - practice the motion until it becomes muscle memory</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-electric-blue">⚡</span>
              <span>Watch the command history to see your input timing</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-electric-blue">⚡</span>
              <span>A regular EWGF is still great - PEWGF is the ultimate goal</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-tekken-gold">★</span>
              <span>In competitive play, PEWGF gives you more frame advantage!</span>
            </li>
          </ul>
        </motion.div>
        </div>
      </div>
    </div>
  )
}

