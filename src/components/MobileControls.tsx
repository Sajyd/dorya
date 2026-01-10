'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface MobileControlsProps {
  isPlaying: boolean
  onInputChange: (keys: Set<string>) => void
  playerSide?: 'p1' | 'p2'
}

export default function MobileControls({ isPlaying, onInputChange, playerSide = 'p1' }: MobileControlsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  // Track which touch identifiers are pressing which keys
  const activeTouchesRef = useRef<Map<number, string>>(new Map())
  // Ref to store the latest onInputChange to avoid stale closures
  const onInputChangeRef = useRef(onInputChange)
  onInputChangeRef.current = onInputChange
  // Track last reported keys to avoid duplicate notifications
  const lastReportedKeysRef = useRef<string>('')

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

  // Sync keys from touches and update state - only notify if keys changed
  const syncKeysFromTouches = useCallback(() => {
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((key) => {
      if (key) keysFromTouches.add(key)
    })
    
    // Convert to sorted string for comparison
    const keysString = Array.from(keysFromTouches).sort().join(',')
    
    // Only update and notify if keys actually changed
    if (keysString !== lastReportedKeysRef.current) {
      lastReportedKeysRef.current = keysString
      setActiveKeys(new Set(keysFromTouches))
      onInputChangeRef.current(new Set(keysFromTouches))
    }
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
  
  const notifyKeysChanged = useCallback((keys: Set<string>) => {
    const keysString = Array.from(keys).sort().join(',')
    if (keysString !== lastReportedKeysRef.current) {
      lastReportedKeysRef.current = keysString
      setActiveKeys(new Set(keys))
      onInputChangeRef.current(new Set(keys))
    }
  }, [])
  
  const handleMouseDown = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.add(key)
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((k) => {
      if (k) keysFromTouches.add(k)
    })
    const combined = new Set([...keysFromTouches, ...mouseKeysRef.current])
    notifyKeysChanged(combined)
  }, [notifyKeysChanged])

  const handleMouseUp = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    mouseKeysRef.current.delete(key)
    const keysFromTouches = new Set<string>()
    activeTouchesRef.current.forEach((k) => {
      if (k) keysFromTouches.add(k)
    })
    const combined = new Set([...keysFromTouches, ...mouseKeysRef.current])
    notifyKeysChanged(combined)
  }, [notifyKeysChanged])

  if (!isMobile || !isPlaying) return null

  const isKeyActive = (key: string) => activeKeys.has(key)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
      <div className="flex justify-between items-end p-4 pb-8">
        {/* Left side - Direction pad */}
        <div className="pointer-events-auto">
          {/* Arcade stick style layout */}
          <div className="relative">
            {/* Direction buttons: Backward, Down, Forward */}
            <div className="flex items-center gap-2">
              {/* Backward button - becomes Forward on P2 side */}
              <button
                data-mobile-key="KeyA"
                className={`
                  w-16 h-16 rounded-2xl
                  flex flex-col items-center justify-center
                  font-tekken text-lg tracking-wider
                  select-none touch-none
                  bg-black/60 backdrop-blur-sm
                  border-2
                  ${isKeyActive('KeyA')
                    ? playerSide === 'p2'
                      ? 'border-electric-blue text-electric-blue'
                      : 'border-gray-500 text-gray-400'
                    : 'border-gray-600 text-gray-500'
                  }
                `}
                onMouseDown={handleMouseDown('KeyA')}
                onMouseUp={handleMouseUp('KeyA')}
                onMouseLeave={handleMouseUp('KeyA')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-xl font-bold">←</span>
                <span className="text-[10px] text-gray-500 mt-0.5">{playerSide === 'p2' ? 'FWD' : 'BACK'}</span>
              </button>
              
              {/* Down button */}
              <button
                data-mobile-key="KeyS"
                className={`
                  w-16 h-16 rounded-2xl
                  flex flex-col items-center justify-center
                  font-tekken text-lg tracking-wider
                  select-none touch-none
                  bg-black/60 backdrop-blur-sm
                  border-2
                  ${isKeyActive('KeyS')
                    ? 'border-electric-purple text-electric-purple' 
                    : 'border-gray-600 text-gray-400'
                  }
                `}
                onMouseDown={handleMouseDown('KeyS')}
                onMouseUp={handleMouseUp('KeyS')}
                onMouseLeave={handleMouseUp('KeyS')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-xl font-bold">↓</span>
                <span className="text-[10px] text-gray-500 mt-0.5">DOWN</span>
              </button>
              
              {/* Forward button - becomes Backward on P2 side */}
              <button
                data-mobile-key="KeyD"
                className={`
                  w-16 h-16 rounded-2xl
                  flex flex-col items-center justify-center
                  font-tekken text-lg tracking-wider
                  select-none touch-none
                  bg-black/60 backdrop-blur-sm
                  border-2
                  ${isKeyActive('KeyD')
                    ? playerSide === 'p1'
                      ? 'border-electric-blue text-electric-blue'
                      : 'border-gray-500 text-gray-400'
                    : 'border-gray-600 text-gray-400'
                  }
                `}
                onMouseDown={handleMouseDown('KeyD')}
                onMouseUp={handleMouseUp('KeyD')}
                onMouseLeave={handleMouseUp('KeyD')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-xl font-bold">→</span>
                <span className="text-[10px] text-gray-500 mt-0.5">{playerSide === 'p1' ? 'FWD' : 'BACK'}</span>
              </button>
            </div>
            
            {/* Visual hint for df combo */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-gray-600 text-xs font-mono whitespace-nowrap">
              <div className="text-center opacity-60">
                <div>{playerSide === 'p2' ? '←+↓ = df' : '↓+→ = df'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Punch button */}
        <div className="pointer-events-auto">
          <button
            data-mobile-key="KeyK"
            className={`
              w-28 h-28 rounded-full
              flex flex-col items-center justify-center
              font-tekken text-2xl tracking-wider
              select-none touch-none
              bg-black/60 backdrop-blur-sm
              border-[3px]
              ${isKeyActive('KeyK')
                ? 'border-tekken-gold text-tekken-gold' 
                : 'border-tekken-gold/50 text-tekken-gold/70'
              }
            `}
            onMouseDown={handleMouseDown('KeyK')}
            onMouseUp={handleMouseUp('KeyK')}
            onMouseLeave={handleMouseUp('KeyK')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-4xl font-black">2</span>
            <span className="text-xs opacity-70">PUNCH</span>
          </button>
        </div>
      </div>
    </div>
  )
}
