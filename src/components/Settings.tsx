'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@/context/UserContext'
import { useCustomization } from '@/lib/customizationContext'
import { useAudio, GraphicsQuality } from '@/context/AudioContext'
import { KeyBindings, DEFAULT_KEYBINDINGS, PlayerSide } from '@/types/game'

interface SettingsProps {
  onBack: () => void
}

type SettingsTab = 'profile' | 'controls' | 'game' | 'login' | 'signup'

// Helper to get display name for key codes
function getKeyDisplayName(keyCode: string): string {
  // Handle letter keys
  if (keyCode.startsWith('Key')) {
    return keyCode.replace('Key', '')
  }
  // Handle digit keys
  if (keyCode.startsWith('Digit')) {
    return keyCode.replace('Digit', '')
  }
  // Handle special keys
  const specialKeys: Record<string, string> = {
    'Space': 'SPACE',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ShiftLeft': 'L SHIFT',
    'ShiftRight': 'R SHIFT',
    'ControlLeft': 'L CTRL',
    'ControlRight': 'R CTRL',
    'AltLeft': 'L ALT',
    'AltRight': 'R ALT',
    'Enter': 'ENTER',
    'Backspace': 'BACKSPACE',
    'Tab': 'TAB',
    'Escape': 'ESC',
    'CapsLock': 'CAPS',
    'Semicolon': ';',
    'Quote': "'",
    'Backquote': '`',
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backslash': '\\',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Minus': '-',
    'Equal': '=',
  }
  return specialKeys[keyCode] || keyCode
}

export default function Settings({ onBack }: SettingsProps) {
  const { user, isLoggedIn, updateGuestUsername, login, signup, logout } = useUser()
  const { syncFromServer, keybindings, updateKeybinding, updatePlayerSide, resetKeybindings } = useCustomization()
  const { settings: audioSettings, setMusicEnabled, setSfxEnabled, setMusicVolume, setSfxVolume, setShowFps, setGraphicsQuality } = useAudio()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  
  // Profile state
  const [newUsername, setNewUsername] = useState(user?.username || '')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSaved, setUsernameSaved] = useState(false)
  
  // Auth state
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authSuccess, setAuthSuccess] = useState(false)
  
  // Keybinding state
  const [listeningFor, setListeningFor] = useState<keyof KeyBindings | null>(null)
  const [keybindingSaved, setKeybindingSaved] = useState(false)
  
  // Handle keybinding capture
  const handleKeyCapture = useCallback((e: KeyboardEvent) => {
    if (!listeningFor) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Don't allow Escape - it's used to cancel
    if (e.code === 'Escape') {
      setListeningFor(null)
      return
    }
    
    // Update the keybinding
    updateKeybinding(listeningFor, e.code)
    setListeningFor(null)
    setKeybindingSaved(true)
    setTimeout(() => setKeybindingSaved(false), 2000)
  }, [listeningFor, updateKeybinding])
  
  // Add/remove key listener for keybinding capture
  useEffect(() => {
    if (listeningFor) {
      window.addEventListener('keydown', handleKeyCapture, true)
      return () => window.removeEventListener('keydown', handleKeyCapture, true)
    }
  }, [listeningFor, handleKeyCapture])
  
  const handleResetKeybindings = async () => {
    await resetKeybindings()
    setKeybindingSaved(true)
    setTimeout(() => setKeybindingSaved(false), 2000)
  }

  const handleUsernameChange = async () => {
    setUsernameError(null)
    setUsernameSaved(false)
    
    if (!user?.isGuest) {
      setUsernameError('Cannot change username for registered accounts')
      return
    }
    
    const clean = newUsername.trim().toUpperCase()
    
    if (clean.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }
    
    if (clean.length > 20) {
      setUsernameError('Username must be 20 characters or less')
      return
    }
    
    if (!/^[A-Z0-9_]+$/.test(clean)) {
      setUsernameError('Only letters, numbers, and underscores allowed')
      return
    }
    
    const success = await updateGuestUsername(clean)
    if (success) {
      setUsernameSaved(true)
      setNewUsername(clean)
      setTimeout(() => setUsernameSaved(false), 2000)
    } else {
      setUsernameError('Failed to update username')
    }
  }

  const handleLogin = async () => {
    setAuthError(null)
    setAuthLoading(true)
    
    const result = await login(authUsername, authPassword)
    
    if (result.success) {
      // Sync server data to local state
      if (result.playerData) {
        syncFromServer(result.playerData)
      }
      setAuthSuccess(true)
      setTimeout(() => {
        setActiveTab('profile')
        setAuthSuccess(false)
      }, 1000)
    } else {
      setAuthError(result.error || 'Login failed')
    }
    
    setAuthLoading(false)
  }

  const handleSignup = async () => {
    setAuthError(null)
    setAuthLoading(true)
    
    // Server will upgrade the guest player (identified via cookies) to a registered account
    const result = await signup(authUsername, authPassword)
    
    if (result.success) {
      // Sync server data back (server may have merged data)
      if (result.playerData) {
        syncFromServer(result.playerData)
      }
      setAuthSuccess(true)
      setTimeout(() => {
        setActiveTab('profile')
        setAuthSuccess(false)
      }, 1000)
    } else {
      setAuthError(result.error || 'Signup failed')
    }
    
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    // The logout endpoint creates a new guest session and returns playerData
    // which will be synced via pendingPlayerData, so we don't need to reset manually
    setActiveTab('profile')
  }

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 200, 100, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 200, 100, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Back button */}
      <motion.button
        className="fixed top-8 left-8 z-20 text-electric-blue font-tekken text-lg tracking-wider flex items-center gap-2 hover:text-white transition-colors"
        onClick={onBack}
        whileHover={{ x: -5 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        ← BACK
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-8 py-20">
          {/* Title */}
          <motion.h1 
            className="font-display text-6xl text-center mb-8 text-white"
            style={{ textShadow: '0 0 30px rgba(255, 200, 100, 0.6)' }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            SETTINGS
          </motion.h1>

          {/* Tab navigation */}
          <motion.div 
            className="flex justify-center gap-2 mb-8 flex-wrap"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {(isLoggedIn 
              ? ['profile', 'controls', 'game'] as SettingsTab[]
              : ['profile', 'controls', 'game', 'login', 'signup'] as SettingsTab[]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setAuthError(null)
                  setAuthUsername('')
                  setAuthPassword('')
                  setListeningFor(null)
                }}
                className={`
                  px-5 py-2 font-tekken text-sm tracking-wider transition-all duration-300
                  border-2 rounded-sm
                  ${activeTab === tab
                    ? 'border-tekken-gold bg-tekken-gold/20 text-tekken-gold'
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }
                `}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                {/* User info */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-tekken-gold to-orange-600 mb-4">
                    <span className="font-display text-3xl text-black">
                      {user?.username?.charAt(0) || '?'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={`
                      px-3 py-1 text-xs font-tekken tracking-wider rounded-full
                      ${isLoggedIn 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                      }
                    `}>
                      {isLoggedIn ? '✓ REGISTERED' : 'GUEST'}
                    </span>
                  </div>
                  
                  <h2 className="font-display text-4xl text-tekken-gold">
                    {user?.username}
                  </h2>
                </div>

                {/* Username edit (guest only) */}
                {user?.isGuest && (
                  <div className="mb-8">
                    <label className="block font-tekken text-sm text-gray-500 tracking-wider mb-2">
                      CHANGE USERNAME
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toUpperCase().slice(0, 20))}
                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded font-tekken text-white tracking-wider focus:border-tekken-gold focus:outline-none uppercase"
                        maxLength={20}
                        placeholder="ENTER USERNAME"
                      />
                      <button
                        onClick={handleUsernameChange}
                        className={`
                          px-6 py-3 font-tekken tracking-wider rounded transition-all
                          ${newUsername !== user?.username
                            ? 'bg-tekken-gold text-black hover:bg-yellow-400'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          }
                        `}
                        disabled={newUsername === user?.username}
                      >
                        SAVE
                      </button>
                    </div>
                    {usernameError && (
                      <p className="text-tekken-red text-sm mt-2 font-tekken">{usernameError}</p>
                    )}
                    {usernameSaved && (
                      <p className="text-green-400 text-sm mt-2 font-tekken">✓ Username saved!</p>
                    )}
                    <p className="text-gray-600 text-xs mt-2 font-sans">
                      Only letters, numbers, and underscores. 3-20 characters.
                    </p>
                  </div>
                )}

                {/* Guest info */}
                {user?.isGuest && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
                    <h3 className="font-tekken text-sm text-tekken-gold tracking-wider mb-2">
                      ⚡ CREATE AN ACCOUNT
                    </h3>
                    <p className="text-gray-400 text-sm font-sans mb-3">
                      Register to lock your username, sync progress across devices, and appear on the leaderboard with your unique name!
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('signup')
                        setAuthUsername(user?.username || '')
                      }}
                      className="px-4 py-2 bg-tekken-gold/20 border border-tekken-gold/50 text-tekken-gold font-tekken text-sm tracking-wider rounded hover:bg-tekken-gold/30 transition-all"
                    >
                      CREATE ACCOUNT →
                    </button>
                  </div>
                )}

                {/* Logged in user actions */}
                {isLoggedIn && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      <h3 className="font-tekken text-sm text-gray-400 tracking-wider mb-2">
                        ACCOUNT STATUS
                      </h3>
                      <p className="text-white font-sans">
                        Your progress and scores are synced to your account.
                      </p>
                      <p className="text-gray-500 text-sm font-sans mt-1">
                        Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 bg-tekken-red/20 border border-tekken-red/50 text-tekken-red font-tekken tracking-wider rounded hover:bg-tekken-red/30 transition-all"
                    >
                      LOG OUT
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'controls' && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                <h2 className="font-display text-3xl text-center text-white mb-2">
                  CONTROLS
                </h2>
                <p className="text-gray-500 text-sm text-center mb-8 font-sans">
                  Click a key to rebind. Press ESC to cancel.
                </p>

                {/* Keybinding rows */}
                <div className="space-y-4 mb-8">
                  {/* Forward */}
                  <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div>
                      <span className="font-tekken text-sm text-tekken-gold tracking-wider">FORWARD</span>
                      <p className="text-gray-500 text-xs font-sans mt-1">Move forward / Crouch dash</p>
                    </div>
                    <button
                      onClick={() => setListeningFor('forward')}
                      className={`
                        px-6 py-3 min-w-[100px] font-tekken text-lg tracking-wider rounded transition-all
                        ${listeningFor === 'forward'
                          ? 'bg-electric-blue/30 border-2 border-electric-blue text-electric-blue animate-pulse'
                          : 'bg-gray-800 border-2 border-gray-600 text-white hover:border-tekken-gold'
                        }
                      `}
                    >
                      {listeningFor === 'forward' ? '...' : getKeyDisplayName(keybindings.forward)}
                    </button>
                  </div>

                  {/* Down */}
                  <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div>
                      <span className="font-tekken text-sm text-tekken-gold tracking-wider">DOWN</span>
                      <p className="text-gray-500 text-xs font-sans mt-1">Crouch / Part of EWGF motion</p>
                    </div>
                    <button
                      onClick={() => setListeningFor('down')}
                      className={`
                        px-6 py-3 min-w-[100px] font-tekken text-lg tracking-wider rounded transition-all
                        ${listeningFor === 'down'
                          ? 'bg-electric-blue/30 border-2 border-electric-blue text-electric-blue animate-pulse'
                          : 'bg-gray-800 border-2 border-gray-600 text-white hover:border-tekken-gold'
                        }
                      `}
                    >
                      {listeningFor === 'down' ? '...' : getKeyDisplayName(keybindings.down)}
                    </button>
                  </div>

                  {/* Punch (2) */}
                  <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div>
                      <span className="font-tekken text-sm text-tekken-gold tracking-wider">PUNCH (2)</span>
                      <p className="text-gray-500 text-xs font-sans mt-1">Right punch for EWGF</p>
                    </div>
                    <button
                      onClick={() => setListeningFor('punch')}
                      className={`
                        px-6 py-3 min-w-[100px] font-tekken text-lg tracking-wider rounded transition-all
                        ${listeningFor === 'punch'
                          ? 'bg-electric-blue/30 border-2 border-electric-blue text-electric-blue animate-pulse'
                          : 'bg-gray-800 border-2 border-gray-600 text-white hover:border-tekken-gold'
                        }
                      `}
                    >
                      {listeningFor === 'punch' ? '...' : getKeyDisplayName(keybindings.punch)}
                    </button>
                  </div>

                  {/* Backward */}
                  <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div>
                      <span className="font-tekken text-sm text-tekken-gold tracking-wider">BACKWARD</span>
                      <p className="text-gray-500 text-xs font-sans mt-1">Move backward (P2 side forward)</p>
                    </div>
                    <button
                      onClick={() => setListeningFor('backward')}
                      className={`
                        px-6 py-3 min-w-[100px] font-tekken text-lg tracking-wider rounded transition-all
                        ${listeningFor === 'backward'
                          ? 'bg-electric-blue/30 border-2 border-electric-blue text-electric-blue animate-pulse'
                          : 'bg-gray-800 border-2 border-gray-600 text-white hover:border-tekken-gold'
                        }
                      `}
                    >
                      {listeningFor === 'backward' ? '...' : getKeyDisplayName(keybindings.backward)}
                    </button>
                  </div>
                </div>

                {/* Saved message */}
                {keybindingSaved && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-400 text-sm text-center font-tekken mb-4"
                  >
                    ✓ Controls saved!
                  </motion.p>
                )}

                {/* Player Side Selection */}
                <div className="border-t border-gray-700 pt-6 mt-2">
                  <h3 className="font-tekken text-sm text-electric-blue tracking-wider mb-4">
                    DEFAULT PLAYER SIDE
                  </h3>
                  <p className="text-gray-500 text-xs font-sans mb-4">
                    Choose which side you play on. P2 side inverts controls (forward becomes backward key).
                  </p>
                  <div className="flex gap-2">
                    {(['p1', 'p2', 'ask'] as PlayerSide[]).map((side) => (
                      <button
                        key={side}
                        onClick={() => updatePlayerSide(side)}
                        className={`flex-1 px-4 py-3 font-tekken text-sm tracking-wider rounded transition-all duration-200 border-2 ${
                          keybindings.playerSide === side
                            ? 'border-tekken-gold bg-tekken-gold/20 text-tekken-gold'
                            : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {side === 'p1' ? 'PLAYER 1' : side === 'p2' ? 'PLAYER 2' : 'ASK'}
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-600 text-xs font-sans mt-2">
                    {keybindings.playerSide === 'ask' 
                      ? "You'll choose your side at the start of each game."
                      : keybindings.playerSide === 'p1'
                        ? "You're on the left side. Forward = toward opponent."
                        : "You're on the right side. Forward = backward key."}
                  </p>
                </div>

                {/* Reset button */}
                <button
                  onClick={handleResetKeybindings}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 text-gray-400 font-tekken tracking-wider rounded hover:bg-gray-700/50 hover:text-white transition-all mt-6"
                >
                  RESET TO DEFAULTS
                </button>

                {/* Default keys info */}
                <div className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                  <p className="text-gray-500 text-xs font-sans">
                    <span className="text-gray-400 font-tekken">DEFAULT KEYS:</span>{' '}
                    D (Forward), A (Backward), S (Down), K (Punch)
                  </p>
                  <p className="text-gray-600 text-xs font-sans mt-2">
                    Your keybindings are saved to your account and sync across devices.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'game' && (
              <motion.div
                key="game"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                <h2 className="font-display text-3xl text-center text-white mb-8">
                  GAME SETTINGS
                </h2>

                {/* Graphics Quality */}
                <div className="mb-8">
                  <h3 className="font-tekken text-sm text-tekken-gold tracking-wider mb-4">
                    GRAPHICS QUALITY
                  </h3>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as GraphicsQuality[]).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setGraphicsQuality(quality)}
                        className={`flex-1 px-4 py-3 font-tekken text-sm tracking-wider rounded transition-all duration-200 border-2 ${
                          audioSettings.graphicsQuality === quality
                            ? 'border-tekken-gold bg-tekken-gold/20 text-tekken-gold'
                            : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {quality.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-600 text-xs mt-2 font-sans">
                    Lower quality improves performance on older devices.
                  </p>
                </div>

                {/* Show FPS */}
                <div className="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-4">
                  <div>
                    <span className="font-tekken text-sm text-white tracking-wider">SHOW FPS</span>
                    <p className="text-gray-500 text-xs font-sans mt-1">Display frame rate counter</p>
                  </div>
                  <button
                    onClick={() => setShowFps(!audioSettings.showFps)}
                    className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                      audioSettings.showFps 
                        ? 'bg-tekken-gold' 
                        : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-200 ${
                        audioSettings.showFps ? 'left-[30px]' : 'left-[2px]'
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-gray-700 my-6" />

                {/* Audio Settings */}
                <h3 className="font-tekken text-sm text-electric-blue tracking-wider mb-4">
                  AUDIO
                </h3>

                {/* Music Toggle & Volume */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <svg 
                        className="w-5 h-5 text-gray-400" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      <span className="font-tekken text-sm text-white tracking-wider">MUSIC</span>
                    </div>
                    <button
                      onClick={() => setMusicEnabled(!audioSettings.musicEnabled)}
                      className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                        audioSettings.musicEnabled 
                          ? 'bg-tekken-gold' 
                          : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-200 ${
                          audioSettings.musicEnabled ? 'left-[30px]' : 'left-[2px]'
                        }`}
                      />
                    </button>
                  </div>
                  {audioSettings.musicEnabled && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs font-tekken w-12">VOL</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(audioSettings.musicVolume * 100)}
                        onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tekken-gold"
                      />
                      <span className="text-gray-400 text-xs font-mono w-8 text-right">
                        {Math.round(audioSettings.musicVolume * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* SFX Toggle & Volume */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <svg 
                        className="w-5 h-5 text-gray-400" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                      <span className="font-tekken text-sm text-white tracking-wider">SOUND EFFECTS</span>
                    </div>
                    <button
                      onClick={() => setSfxEnabled(!audioSettings.sfxEnabled)}
                      className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                        audioSettings.sfxEnabled 
                          ? 'bg-electric-blue' 
                          : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-200 ${
                          audioSettings.sfxEnabled ? 'left-[30px]' : 'left-[2px]'
                        }`}
                      />
                    </button>
                  </div>
                  {audioSettings.sfxEnabled && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs font-tekken w-12">VOL</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(audioSettings.sfxVolume * 100)}
                        onChange={(e) => setSfxVolume(parseInt(e.target.value) / 100)}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-electric-blue"
                      />
                      <span className="text-gray-400 text-xs font-mono w-8 text-right">
                        {Math.round(audioSettings.sfxVolume * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                  <p className="text-gray-600 text-xs font-sans">
                    Your game settings are saved to your account and sync across devices.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                <h2 className="font-display text-3xl text-center text-white mb-6">
                  LOG IN
                </h2>
                
                {authSuccess ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">⚡</div>
                    <p className="font-tekken text-tekken-gold tracking-wider text-xl">
                      LOGIN SUCCESSFUL!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-tekken text-sm text-gray-500 tracking-wider mb-2">
                        USERNAME
                      </label>
                      <input
                        type="text"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded font-tekken text-white tracking-wider focus:border-electric-blue focus:outline-none uppercase"
                        placeholder="ENTER USERNAME"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-tekken text-sm text-gray-500 tracking-wider mb-2">
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded font-sans text-white focus:border-electric-blue focus:outline-none"
                        placeholder="Enter password"
                      />
                    </div>
                    
                    {authError && (
                      <p className="text-tekken-red text-sm font-tekken">{authError}</p>
                    )}
                    
                    <button
                      onClick={handleLogin}
                      disabled={authLoading || !authUsername || !authPassword}
                      className={`
                        w-full px-6 py-4 font-tekken text-lg tracking-wider rounded transition-all
                        ${authLoading || !authUsername || !authPassword
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-electric-blue text-black hover:bg-electric-purple'
                        }
                      `}
                    >
                      {authLoading ? 'LOGGING IN...' : 'LOG IN'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                <h2 className="font-display text-3xl text-center text-white mb-6">
                  CREATE ACCOUNT
                </h2>
                
                {authSuccess ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">⚡</div>
                    <p className="font-tekken text-tekken-gold tracking-wider text-xl">
                      ACCOUNT CREATED!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-tekken text-sm text-gray-500 tracking-wider mb-2">
                        USERNAME
                      </label>
                      <input
                        type="text"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 20))}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded font-tekken text-white tracking-wider focus:border-tekken-gold focus:outline-none uppercase"
                        placeholder="CHOOSE USERNAME"
                        maxLength={20}
                      />
                      <p className="text-gray-600 text-xs mt-1 font-sans">
                        3-20 characters. Letters, numbers, underscores only.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block font-tekken text-sm text-gray-500 tracking-wider mb-2">
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded font-sans text-white focus:border-tekken-gold focus:outline-none"
                        placeholder="Choose password (min 6 characters)"
                      />
                    </div>
                    
                    {authError && (
                      <p className="text-tekken-red text-sm font-tekken">{authError}</p>
                    )}
                    
                    <button
                      onClick={handleSignup}
                      disabled={authLoading || authUsername.length < 3 || authPassword.length < 6}
                      className={`
                        w-full px-6 py-4 font-tekken text-lg tracking-wider rounded transition-all
                        ${authLoading || authUsername.length < 3 || authPassword.length < 6
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-tekken-gold text-black hover:bg-yellow-400'
                        }
                      `}
                    >
                      {authLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
                    </button>
                    
                    <p className="text-gray-500 text-xs text-center font-sans">
                      Your username will appear on leaderboards and cannot be changed after registration.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

