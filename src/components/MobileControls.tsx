'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'

interface MobileControlsProps {
  isPlaying: boolean
  onInputChange: (keys: Set<string>) => void
}

export default function MobileControls({ isPlaying, onInputChange }: MobileControlsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  // Track which touch identifiers are pressing which keys
  const activeTouchesRef = useRef<Map<number, string>>(new Map())
  // Store refs to button elements for hit testing
  const buttonRefsRef = useRef<Map<string, HTMLButtonElement>>(new Map())

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

  const syncKeysFromTouches = useCallback(() => {
    // Build set of keys from active touches
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((key) => {
      if (key) keysFromTouches.add(key)
    })
    
    // Update state and notify parent
    setActiveKeys(new Set(keysFromTouches))
    onInputChange(new Set(keysFromTouches))
  }, [onInputChange])

  // Get which button key a touch point is over
  const getKeyAtPoint = useCallback((x: number, y: number): string | null => {
    for (const [key, element] of buttonRefsRef.current.entries()) {
      if (!element) continue
      const rect = element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return key
      }
    }
    return null
  }, [])

  // Process all current touches and update state
  const processTouches = useCallback((touches: TouchList) => {
    // Get all current touch identifiers
    const currentTouchIds = new Set<number>()
    for (let i = 0; i < touches.length; i++) {
      currentTouchIds.add(touches[i].identifier)
    }
    
    // Remove any tracked touches that are no longer active
    for (const touchId of activeTouchesRef.current.keys()) {
      if (!currentTouchIds.has(touchId)) {
        activeTouchesRef.current.delete(touchId)
      }
    }
    
    // Update each active touch's key based on current position
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      const key = getKeyAtPoint(touch.clientX, touch.clientY)
      if (key) {
        activeTouchesRef.current.set(touch.identifier, key)
      } else {
        // Touch is not over any button
        activeTouchesRef.current.delete(touch.identifier)
      }
    }
    
    syncKeysFromTouches()
  }, [getKeyAtPoint, syncKeysFromTouches])

  // Global touch handlers for reliable multi-touch tracking
  useEffect(() => {
    const handleGlobalTouchStart = (e: TouchEvent) => {
      processTouches(e.touches)
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      processTouches(e.touches)
    }

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      // Process remaining touches (e.touches excludes the ended touch)
      processTouches(e.touches)
      
      // If no touches remain, clear everything
      if (e.touches.length === 0) {
        activeTouchesRef.current.clear()
        syncKeysFromTouches()
      }
    }

    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true })
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true })
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
      document.removeEventListener('touchcancel', handleGlobalTouchEnd)
    }
  }, [processTouches, syncKeysFromTouches])

  // Register button ref
  const setButtonRef = useCallback((key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      buttonRefsRef.current.set(key, el)
    } else {
      buttonRefsRef.current.delete(key)
    }
  }, [])

  // Mouse handlers for desktop testing
  const mouseKeysRef = useRef<Set<string>>(new Set())
  
  const handleMouseDown = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.add(key)
    // Combine mouse keys with touch keys
    const combined = new Set([...activeKeys, ...mouseKeysRef.current])
    setActiveKeys(combined)
    onInputChange(combined)
  }, [activeKeys, onInputChange])

  const handleMouseUp = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.delete(key)
    // Rebuild from touches + remaining mouse keys
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((k) => {
      if (k) keysFromTouches.add(k)
    })
    const combined = new Set([...keysFromTouches, ...mouseKeysRef.current])
    setActiveKeys(combined)
    onInputChange(combined)
  }, [onInputChange])

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
        ref={setButtonRef(keyCode)}
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
        ref={setButtonRef('KeyK')}
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



