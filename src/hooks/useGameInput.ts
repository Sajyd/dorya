'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { CommandInput, DoryaAttempt, WavedashAttempt, InputDirection, InputButton } from '@/types/game'

// Key mappings - using fighting game standard layout
const DIRECTION_KEYS: Record<string, InputDirection> = {
  'KeyD': 'f',  // Forward
  'KeyS': 'd',  // Down
  // Down-forward is S+D pressed together
}

const BUTTON_KEYS: Record<string, InputButton> = {
  'KeyK': '2',  // Right punch (2 in Tekken notation)
}

// Valid keys that the game accepts
const VALID_KEYS = new Set(['KeyD', 'KeyS', 'KeyK'])

// Gamepad button mappings (standard gamepad layout)
// https://w3c.github.io/gamepad/#remapping
const GAMEPAD_PUNCH_BUTTONS = [0, 1, 2, 3] // A/B/X/Y or Cross/Circle/Square/Triangle
const GAMEPAD_DPAD_DOWN = 13
const GAMEPAD_DPAD_RIGHT = 15
const GAMEPAD_STICK_THRESHOLD = 0.5 // Threshold for analog stick activation

// Frame timing (60fps = ~16.67ms per frame)
const FRAME_MS = 1000 / 60

interface UseGameInputReturn {
  currentInputs: CommandInput[]
  lastAttempt: DoryaAttempt | null
  lastWavedash: WavedashAttempt | null
  activeKeys: Set<string>
  resetInputs: () => void
  inputHistory: CommandInput[]
  handleTouchInput: (touchKeys: Set<string>) => void
  controllerConnected: boolean
}

export function useGameInput(
  isPlaying: boolean,
  onDoryaAttempt: (attempt: DoryaAttempt) => void,
  onWavedash?: (attempt: WavedashAttempt) => void
): UseGameInputReturn {
  const [currentInputs, setCurrentInputs] = useState<CommandInput[]>([])
  const [lastAttempt, setLastAttempt] = useState<DoryaAttempt | null>(null)
  const [lastWavedash, setLastWavedash] = useState<WavedashAttempt | null>(null)
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

  // Check if inputs form a valid wavedash motion (f → n → d → df) without punch
  const checkWavedashMotion = useCallback((inputs: CommandInput[]): WavedashAttempt | null => {
    // Find the key inputs (direction only, no button)
    const forwardInput = inputs.find(i => i.direction === 'f' && i.button === 'none')
    const neutralInput = inputs.find(i => i.direction === 'n' && i.button === 'none')
    const downInput = inputs.find(i => i.direction === 'd' && i.button === 'none')
    const dfInput = inputs.find(i => i.direction === 'df' && i.button === 'none')
    
    // Must have all four inputs for a wavedash
    if (!forwardInput || !dfInput) {
      return null
    }
    
    // Check sequence order: f → ... → df
    if (forwardInput.timestamp > dfInput.timestamp) {
      return null
    }
    
    // Check if we have the clean motion: f → n → d → df
    let isClean = false
    if (neutralInput && downInput) {
      // Full clean motion: f → n → d → df
      if (forwardInput.timestamp < neutralInput.timestamp &&
          neutralInput.timestamp < downInput.timestamp &&
          downInput.timestamp < dfInput.timestamp) {
        isClean = true
      }
    } else if (downInput) {
      // Acceptable: f → d → df (skipped neutral)
      if (forwardInput.timestamp < downInput.timestamp &&
          downInput.timestamp < dfInput.timestamp) {
        isClean = true
      }
    }
    
    // Valid wavedash motion
    return {
      inputs: [...inputs],
      timestamp: Date.now(),
      isClean,
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
    // EWGF input: f, n, d, df+2 (14 frame startup)
    // True PEWGF (13 frame startup): f, n, df+2 OR f, d~df+2 on same frame
    // INVALID patterns:
    //   - f, n, df, df+2 (separate df before df+2 on different frame)
    //   - f, n, f, df, df+2 (extra forward after neutral)
    //   - f, n, d, df, df+2 (separate df after d)
    //   - f, df, df+2 (no neutral or down, just held forward)
    
    // Find the key inputs
    const forwardInput = inputs.find(i => i.direction === 'f' && i.button === 'none')
    const neutralInput = inputs.find(i => i.direction === 'n' && i.button === 'none')
    const downInput = inputs.find(i => i.direction === 'd' && i.button === 'none')
    const dfPunchInput = inputs.find(i => i.direction === 'df' && i.button === '2')
    const dfNoPunchInput = inputs.find(i => i.direction === 'df' && i.button === 'none')
    
    // Must have forward and df+2
    if (!forwardInput || !dfPunchInput) {
      return null
    }
    
    // Check sequence order: forward must come before df+2
    if (forwardInput.timestamp > dfPunchInput.timestamp) {
      return null
    }
    
    // INVALID: If there's any df (without punch) in the sequence after forward
    // This means df and df+2 were on different frames (otherwise df would be replaced by df+2)
    // Catches: f, n, df, df+2 | f, df, df+2 | f, n, d, df, df+2 | etc.
    // HOWEVER: Allow if df and df+2 are within 1 frame (same input motion split across frame boundary)
    // This handles cases where player transitions from d to df+2 but keyboard events fire separately
    if (dfNoPunchInput && dfNoPunchInput.timestamp > forwardInput.timestamp) {
      const frameDiffDfToDfPunch = dfPunchInput.frame - dfNoPunchInput.frame
      // Only invalidate if df was held for more than 1 frame before pressing punch
      if (frameDiffDfToDfPunch > 1) {
        return null
      }
    }
    
    // INVALID: Check for extra forwards after neutral
    // Catches: f, n, f, df+2 | f, n, f, d, df+2 | etc.
    if (neutralInput) {
      const forwardsAfterNeutral = inputs.filter(i => 
        i.direction === 'f' && 
        i.button === 'none' && 
        i.timestamp > neutralInput.timestamp && 
        i.timestamp < dfPunchInput.timestamp
      )
      if (forwardsAfterNeutral.length > 0) {
        return null
      }
    }
    
    let result: 'perfect' | 'good' | 'bad'
    let frameDiff: number
    
    // Check for f, n, df+2 pattern (PEWGF via neutral)
    const hasNeutralBetween = neutralInput && 
      neutralInput.timestamp > forwardInput.timestamp && 
      neutralInput.timestamp < dfPunchInput.timestamp
    
    // Check for f, d, df+2 pattern (EWGF via down input)
    const hasDownBetween = downInput && 
      downInput.timestamp > forwardInput.timestamp && 
      downInput.timestamp < dfPunchInput.timestamp
    
    if (hasNeutralBetween && !hasDownBetween) {
      // True PEWGF: f → n → df+2 (return to neutral, then direct to df+2)
      // This is the cleanest perfect electric - 13 frame startup
      result = 'perfect'
      frameDiff = 0
    } else if (hasDownBetween) {
      // Calculate timing: frames between d and df+2
      frameDiff = dfPunchInput.frame - downInput!.frame
      
      if (!hasNeutralBetween) {
        // No neutral after forward: f → d → df+2
        // This is only valid as PEWGF (0-1 frame gap between d and df+2)
        if (frameDiff <= 1) {
          // PEWGF: d~df+2 same frame or 1 frame gap
          result = 'perfect'
        } else {
          // Without neutral, anything slower than 1 frame is a MISS
          return null
        }
      } else {
        // Has neutral: f → n → d → df+2 (standard EWGF motion)
        // EWGF can only be performed during wavedash state (~20 frame window)
        const WAVEDASH_WINDOW_FRAMES = 20
        
        if (frameDiff > WAVEDASH_WINDOW_FRAMES) {
          // Outside wavedash window - no longer in wavedash state, not a valid EWGF
          return null
        } else if (frameDiff === 0) {
          // True PEWGF: d and df+2 on same frame - 13 frame startup
          result = 'perfect'
        } else if (frameDiff <= 2) {
          // Good EWGF - 1-2 frame gap - 14 frame startup
          result = 'good'
        } else {
          // Slow EWGF - 3-20 frame gap - valid motion but slow timing
          result = 'bad'
        }
      }
    } else {
      // Invalid motion: no neutral or pure down between f and df+2
      // This happens when player holds forward and adds down, which is incorrect
      return null
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
    
    // Check if last input was on the same frame - if so, replace it instead of adding
    // This handles cases like pressing d+f together which fires separate keydown events
    // but should only show "df" (or "df+2") not "d, df" (or "df, df+2")
    const lastInput = inputBufferRef.current[inputBufferRef.current.length - 1]
    if (lastInput && lastInput.frame === frame) {
      // Same frame - replace the previous input with the combined state
      inputBufferRef.current[inputBufferRef.current.length - 1] = input
      setCurrentInputs([...inputBufferRef.current])
      setInputHistory(prev => [...prev.slice(0, -1), input]) // Replace last input in history
    } else {
      // Different frame - add as new input
      inputBufferRef.current.push(input)
      setCurrentInputs([...inputBufferRef.current])
      setInputHistory(prev => [...prev.slice(-19), input]) // Keep last 20 inputs
    }
    
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
    } else if (direction === 'df' && button === 'none') {
      // Wavedash detected: f → n → d → df (without punch)
      if (state.hasForward) {
        const wavedash = checkWavedashMotion(inputBufferRef.current)
        if (wavedash) {
          setLastWavedash(wavedash)
          onWavedash?.(wavedash)
        }
      }
      state.lastDirection = 'df'
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
  }, [getCurrentFrame, checkDoryaInput, checkWavedashMotion, checkWGFMotion, onDoryaAttempt, onWavedash, resetInputs])

  // Shared key processing logic for keyboard, touch, and gamepad
  const keyboardKeysRef = useRef<Set<string>>(new Set())
  const touchKeysRef = useRef<Set<string>>(new Set())
  const gamepadKeysRef = useRef<Set<string>>(new Set())
  const lastProcessedDirectionRef = useRef<InputDirection | null>(null)
  
  // Gamepad state
  const [controllerConnected, setControllerConnected] = useState(false)
  const gamepadIndexRef = useRef<number | null>(null)
  const lastPunchPressedRef = useRef(false)

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

  // Combine all input sources (keyboard, touch, gamepad)
  const combineAllKeys = useCallback(() => {
    return new Set([
      ...Array.from(keyboardKeysRef.current),
      ...Array.from(touchKeysRef.current),
      ...Array.from(gamepadKeysRef.current)
    ])
  }, [])

  // Handle touch input from mobile controls
  const handleTouchInput = useCallback((touchKeys: Set<string>) => {
    if (!isPlaying) return
    
    const prevTouchKeys = new Set(touchKeysRef.current)
    touchKeysRef.current = touchKeys
    
    // Combine all input sources
    const allKeys = combineAllKeys()
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
  }, [isPlaying, processKeyState, combineAllKeys])
  
  // Handle gamepad input
  const handleGamepadInput = useCallback((newGamepadKeys: Set<string>, punchJustPressed: boolean) => {
    if (!isPlaying) return
    
    gamepadKeysRef.current = newGamepadKeys
    
    // Combine all input sources
    const allKeys = combineAllKeys()
    setActiveKeys(allKeys)
    
    // Only trigger punch processing when punch button is newly pressed
    const changedKey = punchJustPressed ? 'KeyK' : undefined
    
    processKeyState(allKeys, changedKey)
  }, [isPlaying, processKeyState, combineAllKeys])

  // Gamepad connection handlers
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id)
      gamepadIndexRef.current = e.gamepad.index
      setControllerConnected(true)
    }
    
    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id)
      if (gamepadIndexRef.current === e.gamepad.index) {
        gamepadIndexRef.current = null
        setControllerConnected(false)
        gamepadKeysRef.current.clear()
      }
    }
    
    // Check for already connected gamepads
    const gamepads = navigator.getGamepads()
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepadIndexRef.current = i
        setControllerConnected(true)
        break
      }
    }
    
    window.addEventListener('gamepadconnected', handleGamepadConnected)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)
    
    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
    }
  }, [])
  
  // Gamepad polling loop
  useEffect(() => {
    if (!isPlaying) return
    
    let animationFrameId: number
    
    const pollGamepad = () => {
      if (gamepadIndexRef.current === null) {
        animationFrameId = requestAnimationFrame(pollGamepad)
        return
      }
      
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[gamepadIndexRef.current]
      
      if (!gamepad) {
        animationFrameId = requestAnimationFrame(pollGamepad)
        return
      }
      
      const newKeys = new Set<string>()
      
      // Check D-pad for directions
      if (gamepad.buttons[GAMEPAD_DPAD_DOWN]?.pressed) {
        newKeys.add('KeyS') // Down
      }
      if (gamepad.buttons[GAMEPAD_DPAD_RIGHT]?.pressed) {
        newKeys.add('KeyD') // Forward
      }
      
      // Check left analog stick for directions
      // Stick X: negative = left, positive = right
      // Stick Y: negative = up, positive = down
      if (gamepad.axes[0] > GAMEPAD_STICK_THRESHOLD) {
        newKeys.add('KeyD') // Forward (right)
      }
      if (gamepad.axes[1] > GAMEPAD_STICK_THRESHOLD) {
        newKeys.add('KeyS') // Down
      }
      
      // Check punch buttons (face buttons)
      let punchPressed = false
      for (const buttonIndex of GAMEPAD_PUNCH_BUTTONS) {
        if (gamepad.buttons[buttonIndex]?.pressed) {
          punchPressed = true
          newKeys.add('KeyK')
          break
        }
      }
      
      // Check if punch was just pressed (for input registration)
      const punchJustPressed = punchPressed && !lastPunchPressedRef.current
      lastPunchPressedRef.current = punchPressed
      
      // Check if gamepad state changed
      const prevKeys = gamepadKeysRef.current
      const keysChanged = newKeys.size !== prevKeys.size ||
        Array.from(newKeys).some(k => !prevKeys.has(k)) ||
        Array.from(prevKeys).some(k => !newKeys.has(k))
      
      if (keysChanged || punchJustPressed) {
        handleGamepadInput(newKeys, punchJustPressed)
      }
      
      animationFrameId = requestAnimationFrame(pollGamepad)
    }
    
    animationFrameId = requestAnimationFrame(pollGamepad)
    
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isPlaying, handleGamepadInput])

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
      // Only process valid game keys (D, S, K)
      if (!VALID_KEYS.has(code)) return
      
      keyboardKeysRef.current.add(code)
      
      // Combine all input sources
      const allKeys = combineAllKeys()
      setActiveKeys(allKeys)
      
      processKeyState(allKeys, code)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code
      // Only process valid game keys (D, S, K)
      if (!VALID_KEYS.has(code)) return
      
      keyboardKeysRef.current.delete(code)
      
      // Combine all input sources
      const allKeys = combineAllKeys()
      setActiveKeys(allKeys)
      
      processKeyState(allKeys)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPlaying, processKeyState, combineAllKeys])

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
    lastWavedash,
    activeKeys,
    resetInputs,
    inputHistory,
    handleTouchInput,
    controllerConnected,
  }
}

