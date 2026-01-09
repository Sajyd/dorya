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
  // Ref to store the latest onInputChange to avoid stale closures
  const onInputChangeRef = useRef(onInputChange)
  onInputChangeRef.current = onInputChange

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

  // Get which button key a touch point is over using data attributes
  const getKeyAtPoint = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y)
    if (!element) return null
    
    // Find the button with data-key attribute
    const button = element.closest('[data-mobile-key]') as HTMLElement | null
    return button?.dataset.mobileKey || null
  }, [])

  // Sync keys from touches and update state
  const syncKeysFromTouches = useCallback(() => {
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((key) => {
      if (key) keysFromTouches.add(key)
    })
    
    setActiveKeys(new Set(keysFromTouches))
    onInputChangeRef.current(new Set(keysFromTouches))
  }, [])

  // Process all current touches and update state
  const processTouches = useCallback((touches: TouchList, isStart: boolean = false) => {
    // Build set of current touch IDs
    const currentTouchIds = new Set<number>()
    for (let i = 0; i < touches.length; i++) {
      currentTouchIds.add(touches[i].identifier)
    }
    
    // Remove touches that are no longer on screen
    const toRemove: number[] = []
    activeTouchesRef.current.forEach((_, touchId) => {
      if (!currentTouchIds.has(touchId)) {
        toRemove.push(touchId)
      }
    })
    toRemove.forEach(id => activeTouchesRef.current.delete(id))
    
    // Only register NEW touches on touchstart - don't update existing ones
    // This prevents a held button from switching to another button
    if (isStart) {
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i]
        // Only add if this touch isn't already tracked
        if (!activeTouchesRef.current.has(touch.identifier)) {
          const key = getKeyAtPoint(touch.clientX, touch.clientY)
          if (key) {
            activeTouchesRef.current.set(touch.identifier, key)
          }
        }
      }
    }
    
    syncKeysFromTouches()
  }, [getKeyAtPoint, syncKeysFromTouches])

  // Global touch handlers for reliable multi-touch tracking
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      processTouches(e.touches, true) // true = is start, register new touches
    }

    const handleTouchMove = (e: TouchEvent) => {
      processTouches(e.touches, false) // false = just cleanup ended touches, don't add new
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // e.touches contains only the remaining touches (ended one is removed)
      if (e.touches.length === 0) {
        // All touches ended - clear everything
        activeTouchesRef.current.clear()
        syncKeysFromTouches()
      } else {
        // Some touches remain - process them (cleanup only)
        processTouches(e.touches, false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [processTouches, syncKeysFromTouches])

  // Mouse handlers for desktop testing
  const mouseKeysRef = useRef<Set<string>>(new Set())
  
  const handleMouseDown = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.add(key)
    const combined = new Set([...activeKeys, ...mouseKeysRef.current])
    setActiveKeys(combined)
    onInputChangeRef.current(combined)
  }, [activeKeys])

  const handleMouseUp = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.delete(key)
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((k) => {
      if (k) keysFromTouches.add(k)
    })
    const combined = new Set([...keysFromTouches, ...mouseKeysRef.current])
    setActiveKeys(combined)
    onInputChangeRef.current(combined)
  }, [])

  if (!isMobile || !isPlaying) return null

  const isKeyActive = (key: string) => activeKeys.has(key)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
      <div className="flex justify-between items-end p-4 pb-8">
        {/* Left side - Direction pad */}
        <div className="pointer-events-auto">
          {/* Arcade stick style layout */}
          <div className="relative">
            {/* Direction buttons side by side: Down on left, Forward on right */}
            <div className="flex items-center gap-2">
              {/* Down button */}
              <motion.button
                data-mobile-key="KeyS"
                className={`
                  w-20 h-20 rounded-2xl
                  flex flex-col items-center justify-center
                  font-tekken text-lg tracking-wider
                  select-none touch-none
                  transition-all duration-75
                  ${isKeyActive('KeyS')
                    ? 'bg-electric-blue/40 border-electric-blue text-electric-blue shadow-[0_0_25px_rgba(0,212,255,0.6)] scale-95' 
                    : 'bg-black/60 border-gray-600 text-gray-400 backdrop-blur-sm'
                  }
                  border-2
                `}
                onMouseDown={handleMouseDown('KeyS')}
                onMouseUp={handleMouseUp('KeyS')}
                onMouseLeave={handleMouseUp('KeyS')}
                whileTap={{ scale: 0.9 }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-2xl font-bold">↓</span>
                <span className="text-xs text-gray-500 mt-0.5">DOWN</span>
              </motion.button>
              
              {/* Forward button */}
              <motion.button
                data-mobile-key="KeyD"
                className={`
                  w-20 h-20 rounded-2xl
                  flex flex-col items-center justify-center
                  font-tekken text-lg tracking-wider
                  select-none touch-none
                  transition-all duration-75
                  ${isKeyActive('KeyD')
                    ? 'bg-electric-blue/40 border-electric-blue text-electric-blue shadow-[0_0_25px_rgba(0,212,255,0.6)] scale-95' 
                    : 'bg-black/60 border-gray-600 text-gray-400 backdrop-blur-sm'
                  }
                  border-2
                `}
                onMouseDown={handleMouseDown('KeyD')}
                onMouseUp={handleMouseUp('KeyD')}
                onMouseLeave={handleMouseUp('KeyD')}
                whileTap={{ scale: 0.9 }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-2xl font-bold">→</span>
                <span className="text-xs text-gray-500 mt-0.5">FWD</span>
              </motion.button>
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
          <motion.button
            data-mobile-key="KeyK"
            className={`
              w-28 h-28 rounded-full
              flex flex-col items-center justify-center
              font-tekken text-2xl tracking-wider
              select-none touch-none
              transition-all duration-75
              border-3
              ${isKeyActive('KeyK')
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
            <span className="text-4xl font-black">2</span>
            <span className="text-xs opacity-70">PUNCH</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
