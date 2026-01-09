'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@/context/UserContext'
import { useCustomization } from '@/lib/customizationContext'
import { useAudio, GraphicsQuality } from '@/context/AudioContext'

interface SettingsProps {
  onBack: () => void
}

type SettingsTab = 'profile' | 'login' | 'signup'

const QUALITY_LABELS: Record<GraphicsQuality, { label: string; description: string }> = {
  low: { label: 'LOW', description: '50% resolution, no effects' },
  medium: { label: 'MEDIUM', description: '75% resolution, reduced effects' },
  high: { label: 'HIGH', description: 'Full resolution, all effects' },
}

export default function Settings({ onBack }: SettingsProps) {
  const { user, isLoggedIn, updateGuestUsername, login, signup, logout } = useUser()
  const { syncFromServer } = useCustomization()
  const { settings: audioSettings, setGraphicsQuality } = useAudio()
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
          {!isLoggedIn && (
            <motion.div 
              className="flex justify-center gap-2 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {(['profile', 'login', 'signup'] as SettingsTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    setAuthError(null)
                    setAuthUsername('')
                    setAuthPassword('')
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
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-gray-800 rounded-lg p-8"
              >
                {/* Graphics Quality Setting */}
                <div className="mb-8">
                  <h3 className="font-tekken text-sm text-tekken-gold tracking-wider mb-4">
                    ⚡ GRAPHICS QUALITY
                  </h3>
                  <p className="text-gray-500 text-xs font-sans mb-4">
                    Lower quality for better performance on slower devices
                  </p>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as GraphicsQuality[]).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setGraphicsQuality(quality)}
                        className={`
                          flex-1 px-4 py-3 font-tekken text-sm tracking-wider rounded transition-all duration-300
                          border-2
                          ${audioSettings.graphicsQuality === quality
                            ? 'border-tekken-gold bg-tekken-gold/20 text-tekken-gold'
                            : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                          }
                        `}
                      >
                        <div>{QUALITY_LABELS[quality].label}</div>
                        <div className="text-[10px] mt-1 opacity-70 font-sans normal-case">
                          {QUALITY_LABELS[quality].description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-800 mb-8" />

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

