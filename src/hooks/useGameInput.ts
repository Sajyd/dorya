'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { CommandInput, DoryaAttempt, InputDirection, InputButton } from '@/types/game'

// Key mappings - using fighting game standard layout
const DIRECTION_KEYS: Record<string, InputDirection> = {
  'KeyD': 'f',  // Forward
  'KeyS': 'd',  // Down
  // Down-forward is S+D pressed together
}

const BUTTON_KEYS: Record<string, InputButton> = {
  'KeyK': '2',  // Right punch (2 in Tekken notation)
}

// Frame timing (60fps = ~16.67ms per frame)
const FRAME_MS = 1000 / 60

interface UseGameInputReturn {
  currentInputs: CommandInput[]
  lastAttempt: DoryaAttempt | null
  activeKeys: Set<string>
  resetInputs: () => void
  inputHistory: CommandInput[]
  handleTouchInput: (touchKeys: Set<string>) => void
}

export function useGameInput(
  isPlaying: boolean,
  onDoryaAttempt: (attempt: DoryaAttempt) => void
): UseGameInputReturn {
  const [currentInputs, setCurrentInputs] = useState<CommandInput[]>([])
  const [lastAttempt, setLastAttempt] = useState<DoryaAttempt | null>(null)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [inputHistory, setInputHistory] = useState<CommandInput[]>([])
  
  const inputBufferRef = useRef<CommandInput[]>([])
  const frameCountRef = useRef(0)
  const lastInputTimeRef = useRef(0)
  const inputWindowRef = useRef<NodeJS.Timeout | null>(null)
  const hasProcessedAttemptRef = useRef(false)
  
  // State tracking for EWGF detection
  const stateRef = useRef<{
    hasForward: boolean
    hasDown: boolean
    downFrame: number
    lastDirection: InputDirection | null
  }>({
    hasForward: false,
    hasDown: false,
    downFrame: 0,
    lastDirection: null,
  })

  const getCurrentFrame = useCallback(() => {
    return Math.floor(performance.now() / FRAME_MS)
  }, [])

  const resetInputs = useCallback(() => {
    inputBufferRef.current = []
    stateRef.current = {
      hasForward: false,
      hasDown: false,
      downFrame: 0,
      lastDirection: null,
    }
    hasProcessedAttemptRef.current = false
    setCurrentInputs([])
    if (inputWindowRef.current) {
      clearTimeout(inputWindowRef.current)
    }
  }, [])

  // Check if inputs form a valid WGF motion (f → n → d → df+2) regardless of timing
  const checkWGFMotion = useCallback((inputs: CommandInput[]): boolean => {
    // Find the key inputs
    const forwardInput = inputs.find(i => i.direction === 'f' && i.button === 'none')
    const neutralInput = inputs.find(i => i.direction === 'n' && i.button === 'none')
    const downInput = inputs.find(i => i.direction === 'd' && i.button === 'none')
    const dfPunchInput = inputs.find(i => i.direction === 'df' && i.button === '2')
    
    // Must have forward and df+2 at minimum
    if (!forwardInput || !dfPunchInput) {
      return false
    }
    
    // Check sequence order: forward must come before df+2
    if (forwardInput.timestamp > dfPunchInput.timestamp) {
      return false
    }
    
    // If we have neutral and down, check they're in order: f → n → d → df+2
    if (neutralInput && downInput) {
      if (forwardInput.timestamp > neutralInput.timestamp ||
          neutralInput.timestamp > downInput.timestamp ||
          downInput.timestamp > dfPunchInput.timestamp) {
        return false
      }
    } else if (downInput) {
      // f → d → df+2 pattern
      if (forwardInput.timestamp > downInput.timestamp ||
          downInput.timestamp > dfPunchInput.timestamp) {
        return false
      }
    }
    
    // Valid WGF motion!
    return true
  }, [])

  const checkDoryaInput = useCallback((inputs: CommandInput[]): DoryaAttempt | null => {
    // EWGF input: f, d, df+2 (14 frame startup)
    // True PEWGF (13 frame startup): f, df+2 (no separate d) OR f, d~df+2 on same frame
    
    // Find the key inputs
    const forwardInput = inputs.find(i => i.direction === 'f' && i.button === 'none')
    const downInput = inputs.find(i => i.direction === 'd' && i.button === 'none')
    const dfPunchInput = inputs.find(i => i.direction === 'df' && i.button === '2')
    
    // Must have forward and df+2
    if (!forwardInput || !dfPunchInput) {
      return null
    }
    
    // Check sequence order: forward must come before df+2
    if (forwardInput.timestamp > dfPunchInput.timestamp) {
      return null
    }
    
    let result: 'perfect' | 'good' | 'bad'
    let frameDiff: number
    
    if (!downInput) {
      // True PEWGF: f → df+2 (no separate d input, direct slide to df+2)
      // This is the cleanest perfect electric - 13 frame startup
      result = 'perfect'
      frameDiff = 0
    } else {
      // Check sequence order with d input
      if (forwardInput.timestamp > downInput.timestamp || downInput.timestamp > dfPunchInput.timestamp) {
        return null
      }
      
      // Calculate timing: frames between d and df+2
      frameDiff = dfPunchInput.frame - downInput.frame
      
      if (frameDiff === 0) {
        // True PEWGF: d and df+2 on same frame - 13 frame startup
        result = 'perfect'
      } else if (frameDiff <= 2) {
        // Good EWGF - 1-2 frame gap - 14 frame startup
        result = 'good'
      } else if (frameDiff <= 5) {
        // Regular EWGF - 3-5 frame gap - still acceptable but not great
        result = 'bad'
      } else {
        // Too slow - WGF not electric
        return null
      }
    }
    
    return {
      inputs: [...inputs],
      result,
      timing: frameDiff,
      timestamp: Date.now(),
      validMotion: true,
    }
  }, [])

  const processInput = useCallback((direction: InputDirection, button: InputButton) => {
    const now = Date.now()
    const frame = getCurrentFrame()
    
    const input: CommandInput = {
      direction,
      button,
      timestamp: now,
      frame,
    }
    
    // Add to buffer
    inputBufferRef.current.push(input)
    setCurrentInputs([...inputBufferRef.current])
    setInputHistory(prev => [...prev.slice(-19), input]) // Keep last 20 inputs
    
    // Update state machine
    const state = stateRef.current
    
    if (direction === 'f' && button === 'none') {
      state.hasForward = true
      state.hasDown = false
      state.lastDirection = 'f'
    } else if (direction === 'd' && button === 'none') {
      if (state.hasForward) {
        state.hasDown = true
        state.downFrame = frame
      }
      state.lastDirection = 'd'
    } else if (direction === 'df' && button === '2') {
      // Check for EWGF completion
      // Allow completion if we have f → df+2 (PEWGF) or f → d → df+2 (EWGF)
      if (state.hasForward) {
        const attempt = checkDoryaInput(inputBufferRef.current)
        if (attempt) {
          hasProcessedAttemptRef.current = true
          setLastAttempt(attempt)
          onDoryaAttempt(attempt)
          resetInputs()
          return
        } else {
          // The motion was attempted but timing was off - trigger miss immediately
          const hadValidMotion = checkWGFMotion(inputBufferRef.current)
          hasProcessedAttemptRef.current = true
          const missAttempt: DoryaAttempt = {
            inputs: [...inputBufferRef.current],
            result: 'miss',
            timing: -1,
            timestamp: Date.now(),
            validMotion: hadValidMotion,
          }
          setLastAttempt(missAttempt)
          onDoryaAttempt(missAttempt)
          resetInputs()
          return
        }
      }
    } else if (button === '2') {
      // Punch pressed without proper motion - trigger miss immediately
      hasProcessedAttemptRef.current = true
      const hadValidMotion = checkWGFMotion(inputBufferRef.current)
      const missAttempt: DoryaAttempt = {
        inputs: [...inputBufferRef.current],
        result: 'miss',
        timing: -1,
        timestamp: Date.now(),
        validMotion: hadValidMotion,
      }
      setLastAttempt(missAttempt)
      onDoryaAttempt(missAttempt)
      resetInputs()
      return
    }
    
    // Reset input buffer after timeout (input window)
    if (inputWindowRef.current) {
      clearTimeout(inputWindowRef.current)
    }
    inputWindowRef.current = setTimeout(() => {
      // If we didn't complete an EWGF, it's a miss
      if (inputBufferRef.current.length > 0) {
        const hasPunch = inputBufferRef.current.some(i => i.button === '2')
        if (hasPunch && !hasProcessedAttemptRef.current) {
          hasProcessedAttemptRef.current = true
          // Check if inputs formed a valid WGF motion (f → n → d → df+2) even if timing was off
          const hadValidMotion = checkWGFMotion(inputBufferRef.current)
          const missAttempt: DoryaAttempt = {
            inputs: [...inputBufferRef.current],
            result: 'miss',
            timing: -1,
            timestamp: Date.now(),
            validMotion: hadValidMotion,
          }
          setLastAttempt(missAttempt)
          onDoryaAttempt(missAttempt)
        }
        resetInputs()
      }
    }, 500) // 500ms input window
    
    lastInputTimeRef.current = now
  }, [getCurrentFrame, checkDoryaInput, checkWGFMotion, onDoryaAttempt, resetInputs])

  // Shared key processing logic for both keyboard and touch
  const keyboardKeysRef = useRef<Set<string>>(new Set())
  const touchKeysRef = useRef<Set<string>>(new Set())
  const lastProcessedDirectionRef = useRef<InputDirection | null>(null)

  const processKeyState = useCallback((allKeys: Set<string>, changedKey?: string) => {
    // Check for directions
    const isDown = allKeys.has('KeyS')
    const isForward = allKeys.has('KeyD')
    const isPunch = changedKey === 'KeyK' && allKeys.has('KeyK')
    
    // Determine current direction
    let direction: InputDirection = 'n'
    if (isDown && isForward) {
      direction = 'df'
    } else if (isDown) {
      direction = 'd'
    } else if (isForward) {
      direction = 'f'
    }
    
    // Determine button
    const button: InputButton = isPunch ? '2' : 'none'
    
    // Process if it's a relevant input or returning to neutral
    if (direction !== 'n' || button !== 'none') {
      processInput(direction, button)
      lastProcessedDirectionRef.current = direction
    } else if (lastProcessedDirectionRef.current !== 'n') {
      // Record neutral state
      processInput('n', 'none')
      lastProcessedDirectionRef.current = 'n'
    }
  }, [processInput])

  // Handle touch input from mobile controls
  const handleTouchInput = useCallback((touchKeys: Set<string>) => {
    if (!isPlaying) return
    
    const prevTouchKeys = new Set(touchKeysRef.current)
    touchKeysRef.current = touchKeys
    
    // Combine keyboard and touch keys
    const allKeys = new Set([...Array.from(keyboardKeysRef.current), ...Array.from(touchKeys)])
    setActiveKeys(allKeys)
    
    // Find which key changed (for punch detection)
    let changedKey: string | undefined
    const touchKeysArray = Array.from(touchKeys)
    for (let i = 0; i < touchKeysArray.length; i++) {
      const key = touchKeysArray[i]
      if (!prevTouchKeys.has(key)) {
        changedKey = key
        break
      }
    }
    
    processKeyState(allKeys, changedKey)
  }, [isPlaying, processKeyState])

  // Keyboard event handlers (disabled on mobile/touch devices)
  useEffect(() => {
    if (!isPlaying) return

    // Detect mobile/touch device and disable keyboard input
    const isMobileDevice = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 1024
      return hasTouchScreen && isSmallScreen
    }

    if (isMobileDevice()) {
      // On mobile, don't register keyboard listeners
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      
      const code = e.code
      keyboardKeysRef.current.add(code)
      
      // Combine keyboard and touch keys
      const allKeys = new Set([...Array.from(keyboardKeysRef.current), ...Array.from(touchKeysRef.current)])
      setActiveKeys(allKeys)
      
      processKeyState(allKeys, code)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      keyboardKeysRef.current.delete(code)
      
      // Combine keyboard and touch keys
      const allKeys = new Set([...Array.from(keyboardKeysRef.current), ...Array.from(touchKeysRef.current)])
      setActiveKeys(allKeys)
      
      processKeyState(allKeys)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPlaying, processKeyState])

  // Frame counter
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      frameCountRef.current++
    }, FRAME_MS)

    return () => clearInterval(interval)
  }, [isPlaying])

  return {
    currentInputs,
    lastAttempt,
    activeKeys,
    resetInputs,
    inputHistory,
    handleTouchInput,
  }
}

