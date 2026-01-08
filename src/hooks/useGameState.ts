'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GameMode, GameState, DoryaAttempt } from '@/types/game'

const INITIAL_STATE: GameState = {
  mode: 'FREESTYLE',
  isPlaying: false,
  isPaused: false,
  currentStreak: 0,
  maxStreak: 0,
  totalDoryas: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  timeRemaining: 60,
  elapsedTime: 0,
  currentInputs: [],
  lastAttempt: null,
  attemptHistory: [],
}

interface UseGameStateReturn {
  state: GameState
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: () => void
  handleAttempt: (attempt: DoryaAttempt) => void
  resetGame: () => void
}

export function useGameState(mode: GameMode): UseGameStateReturn {
  const [state, setState] = useState<GameState>({
    ...INITIAL_STATE,
    mode,
    timeRemaining: mode === 'PEWGF_MINUTE' ? 60 : 0,
  })
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Timer for timed modes
  useEffect(() => {
    if (state.isPlaying && !state.isPaused) {
      if (mode === 'PEWGF_MINUTE') {
        timerRef.current = setInterval(() => {
          setState(prev => {
            const newTime = prev.timeRemaining - 1
            if (newTime <= 0) {
              // Time's up - end game
              if (timerRef.current) clearInterval(timerRef.current)
              return { ...prev, timeRemaining: 0, isPlaying: false }
            }
            return { ...prev, timeRemaining: newTime }
          })
        }, 1000)
      } else {
        // Elapsed time counter for other modes
        timerRef.current = setInterval(() => {
          setState(prev => ({
            ...prev,
            elapsedTime: Math.floor((Date.now() - startTimeRef.current) / 1000),
          }))
        }, 1000)
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.isPlaying, state.isPaused, mode])

  const startGame = useCallback(() => {
    startTimeRef.current = Date.now()
    setState({
      ...INITIAL_STATE,
      mode,
      timeRemaining: mode === 'PEWGF_MINUTE' ? 60 : 0,
      isPlaying: true,
    })
  }, [mode])

  const pauseGame = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }))
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const resumeGame = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }))
  }, [])

  const endGame = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }))
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const resetGame = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      mode,
      timeRemaining: mode === 'PEWGF_MINUTE' ? 60 : 0,
    })
    if (timerRef.current) clearInterval(timerRef.current)
  }, [mode])

  const handleAttempt = useCallback((attempt: DoryaAttempt) => {
    setState(prev => {
      let newStreak = prev.currentStreak
      let newPerfect = prev.perfectCount
      let newGood = prev.goodCount
      let newMiss = prev.missCount
      let newTotal = prev.totalDoryas

      switch (attempt.result) {
        case 'perfect':
          newStreak++
          newPerfect++
          newTotal++
          break
        case 'good':
          newStreak++
          newGood++
          newTotal++
          break
        case 'bad':
          // Bad EWGF - streak continues but not counted as dorya
          newStreak++
          newGood++
          break
        case 'miss':
          // Miss - end streak for DORYA_STREAK mode
          if (prev.mode === 'DORYA_STREAK' || prev.mode === 'SURVIVAL') {
            newStreak = 0
            // In survival mode, end the game on miss
            if (prev.mode === 'SURVIVAL' && prev.currentStreak > 0) {
              return {
                ...prev,
                isPlaying: false,
                currentStreak: 0,
                missCount: newMiss + 1,
                lastAttempt: attempt,
                attemptHistory: [...prev.attemptHistory, attempt].slice(-50),
              }
            }
          }
          newMiss++
          break
      }

      return {
        ...prev,
        currentStreak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        totalDoryas: newTotal,
        perfectCount: newPerfect,
        goodCount: newGood,
        missCount: newMiss,
        lastAttempt: attempt,
        attemptHistory: [...prev.attemptHistory, attempt].slice(-50),
      }
    })
  }, [])

  return {
    state,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    handleAttempt,
    resetGame,
  }
}

