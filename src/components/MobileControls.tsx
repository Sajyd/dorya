'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'

interface MobileControlsProps {
  isPlaying: boolean
  onInputChange: (keys: Set<string>) => void
}

export default function MobileControls({ isPlaying, onInputChange }: MobileControlsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const activeKeysRef = useRef<Set<string>>(new Set())
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  // Track which touch identifiers are pressing which keys
  const touchToKeyRef = useRef<Map<number, string>>(new Map())

  // Detect mobile/touch device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 1024
      setIsMobile(hasTouchScreen && isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const updateKeys = useCallback((key: string, pressed: boolean) => {
    if (pressed) {
      activeKeysRef.current.add(key)
    } else {
      activeKeysRef.current.delete(key)
    }
    const newSet = new Set(activeKeysRef.current)
    setActiveKeys(newSet)
    onInputChange(newSet)
  }, [onInputChange])

  const handleTouchStart = useCallback((key: string) => (e: React.TouchEvent) => {
    e.preventDefault()
    // Track each touch by its identifier
    const touches = e.changedTouches
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      touchToKeyRef.current.set(touch.identifier, key)
    }
    updateKeys(key, true)
  }, [updateKeys])

  const handleTouchEnd = useCallback((key: string) => (e: React.TouchEvent) => {
    e.preventDefault()
    // Only release the key if no other touches are holding it
    const touches = e.changedTouches
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      touchToKeyRef.current.delete(touch.identifier)
    }
    
    // Check if any remaining touch is still holding this key
    let stillHeld = false
    touchToKeyRef.current.forEach((heldKey) => {
      if (heldKey === key) stillHeld = true
    })
    
    if (!stillHeld) {
      updateKeys(key, false)
    }
  }, [updateKeys])

  const handleMouseDown = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    updateKeys(key, true)
  }, [updateKeys])

  const handleMouseUp = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    updateKeys(key, false)
  }, [updateKeys])

  // Button component for consistent styling
  const ControlButton = ({ 
    keyCode, 
    label, 
    sublabel,
    className = '',
    size = 'normal'
  }: { 
    keyCode: string
    label: string
    sublabel?: string
    className?: string
    size?: 'normal' | 'large'
  }) => {
    const isActive = activeKeys.has(keyCode)
    const baseSize = size === 'large' ? 'w-20 h-20' : 'w-16 h-16'
    
    return (
      <motion.button
        className={`
          ${baseSize} rounded-2xl
          flex flex-col items-center justify-center
          font-tekken text-lg tracking-wider
          select-none touch-none
          transition-all duration-75
          ${isActive 
            ? 'bg-electric-blue/40 border-electric-blue text-electric-blue shadow-[0_0_25px_rgba(0,212,255,0.6)] scale-95' 
            : 'bg-black/60 border-gray-600 text-gray-400 backdrop-blur-sm'
          }
          border-2
          ${className}
        `}
        onTouchStart={handleTouchStart(keyCode)}
        onTouchEnd={handleTouchEnd(keyCode)}
        onTouchCancel={handleTouchEnd(keyCode)}
        onMouseDown={handleMouseDown(keyCode)}
        onMouseUp={handleMouseUp(keyCode)}
        onMouseLeave={handleMouseUp(keyCode)}
        whileTap={{ scale: 0.9 }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-xl font-bold">{label}</span>
        {sublabel && <span className="text-[10px] text-gray-500 mt-0.5">{sublabel}</span>}
      </motion.button>
    )
  }

  // Punch button with special styling
  const PunchButton = () => {
    const isActive = activeKeys.has('KeyK')
    
    return (
      <motion.button
        className={`
          w-24 h-24 rounded-full
          flex flex-col items-center justify-center
          font-tekken text-2xl tracking-wider
          select-none touch-none
          transition-all duration-75
          border-3
          ${isActive 
            ? 'bg-tekken-gold/40 border-tekken-gold text-tekken-gold shadow-[0_0_40px_rgba(255,215,0,0.7)] scale-95' 
            : 'bg-black/60 border-tekken-gold/50 text-tekken-gold/70 backdrop-blur-sm'
          }
          border-[3px]
        `}
        onTouchStart={handleTouchStart('KeyK')}
        onTouchEnd={handleTouchEnd('KeyK')}
        onTouchCancel={handleTouchEnd('KeyK')}
        onMouseDown={handleMouseDown('KeyK')}
        onMouseUp={handleMouseUp('KeyK')}
        onMouseLeave={handleMouseUp('KeyK')}
        whileTap={{ scale: 0.85 }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-3xl font-black">2</span>
        <span className="text-[10px] opacity-70">PUNCH</span>
      </motion.button>
    )
  }

  if (!isMobile || !isPlaying) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
      <div className="flex justify-between items-end p-4 pb-8">
        {/* Left side - Direction pad */}
        <div className="pointer-events-auto">
          {/* Arcade stick style layout */}
          <div className="relative">
            {/* Direction buttons side by side: Down on left, Forward on right */}
            <div className="flex items-center gap-2">
              {/* Down button on the left */}
              <ControlButton 
                keyCode="KeyS" 
                label="↓" 
                sublabel="DOWN"
              />
              
              {/* Forward button on the right */}
              <ControlButton 
                keyCode="KeyD" 
                label="→" 
                sublabel="FWD"
              />
            </div>
            
            {/* Visual hint for df combo */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-gray-600 text-xs font-mono whitespace-nowrap">
              <div className="text-center opacity-60">
                <div>↓+→ = df</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Punch button */}
        <div className="pointer-events-auto">
          <PunchButton />
        </div>
      </div>
    </div>
  )
}



