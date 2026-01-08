'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import MainMenu from '@/components/MainMenu'
import Game from '@/components/Game'
import HowToPlay from '@/components/HowToPlay'
import Ladder from '@/components/Ladder'
import Shop from '@/components/Shop'
import Locker from '@/components/Locker'
import Settings from '@/components/Settings'
import CrateReadyModal from '@/components/CrateReadyModal'
import LootCrateOpening from '@/components/LootCrateOpening'
import AudioManager from '@/components/AudioManager'
import { CustomizationProvider, useCustomization } from '@/lib/customizationContext'
import { UserProvider, useUser } from '@/context/UserContext'
import { AudioProvider } from '@/context/AudioContext'
import { GameMode, CrateType, ItemRarity } from '@/types/game'

type Screen = 'menu' | 'game' | 'howto' | 'ladder' | 'shop' | 'locker' | 'settings'

interface PendingCrate {
  id: string
  crateType: CrateType
}

interface CrateItem {
  id: string
  name: string
  category: string
  rarity: ItemRarity
  isNew?: boolean
  primaryColor?: string
  secondaryColor?: string
  skinColor?: string
  clothColor?: string
  glowColor?: string
  floorColor?: string
  gridColor?: string
  accentColor?: string
}

// Syncs player data from server when user logs in or app loads with auth
function DataSyncHandler() {
  const { pendingPlayerData, clearPendingPlayerData, isLoggedIn } = useUser()
  const { syncFromServer } = useCustomization()

  useEffect(() => {
    // When there's pending player data from login/signup/verify, sync it
    if (pendingPlayerData && isLoggedIn) {
      syncFromServer(pendingPlayerData)
      clearPendingPlayerData()
    }
  }, [pendingPlayerData, isLoggedIn, syncFromServer, clearPendingPlayerData])

  return null
}

function PaymentHandler({ 
  onCrateReady 
}: { 
  onCrateReady: (crate: PendingCrate) => void 
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    const payment = searchParams.get('payment')
    const sessionId = searchParams.get('session_id')

    if (payment === 'success' && sessionId && user?.username) {
      // Verify the payment and get crate info
      fetch(`/api/stripe/verify?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.crate && !data.crate.isOpened) {
            onCrateReady({
              id: data.crate.id,
              crateType: data.crate.crateType as CrateType,
            })
          }
          // Clear URL params
          router.replace('/', { scroll: false })
        })
        .catch(err => {
          console.error('Failed to verify payment:', err)
          router.replace('/', { scroll: false })
        })
    } else if (payment === 'cancelled') {
      // Clear URL params
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router, user, onCrateReady])

  return null
}

function GameApp() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [gameMode, setGameMode] = useState<GameMode>('FREESTYLE')
  const [pendingCrate, setPendingCrate] = useState<PendingCrate | null>(null)
  const [openingCrate, setOpeningCrate] = useState<PendingCrate | null>(null)
  const [crateItems, setCrateItems] = useState<CrateItem[] | null>(null)
  const { user } = useUser()

  const handlePlay = (mode: GameMode) => {
    setGameMode(mode)
    setScreen('game')
  }

  const handleBack = () => {
    setScreen('menu')
  }

  const handleCrateReady = (crate: PendingCrate) => {
    setPendingCrate(crate)
  }

  const handleOpenCrate = async () => {
    if (!pendingCrate || !user?.username) return
    
    setOpeningCrate(pendingCrate)
    setPendingCrate(null)
  }

  const handleCrateAnimationComplete = async () => {
    if (!openingCrate || !user?.username) return

    try {
      const res = await fetch('/api/crates/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crateId: openingCrate.id,
          username: user.username,
        }),
      })

      const data = await res.json()
      if (data.success && data.items) {
        setCrateItems(data.items)
      }
    } catch (err) {
      console.error('Failed to open crate:', err)
      setOpeningCrate(null)
    }
  }

  const handleClaimRewards = () => {
    setOpeningCrate(null)
    setCrateItems(null)
  }

  // Handler for opening crates from locker
  const handleOpenLockerCrate = (crate: PendingCrate) => {
    setOpeningCrate(crate)
    setScreen('menu')
  }

  return (
    <main className="h-screen w-screen bg-black relative">
      {/* Data sync handler - syncs server data on login */}
      <DataSyncHandler />
      
      {/* Audio Manager - handles background music */}
      <AudioManager currentScreen={screen} />
      
      <Suspense fallback={null}>
        <PaymentHandler onCrateReady={handleCrateReady} />
      </Suspense>

      {screen === 'menu' && (
        <MainMenu 
          onPlay={handlePlay}
          onHowTo={() => setScreen('howto')}
          onLadder={() => setScreen('ladder')}
          onShop={() => setScreen('shop')}
          onLocker={() => setScreen('locker')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'game' && (
        <Game mode={gameMode} onBack={handleBack} />
      )}
      {screen === 'howto' && (
        <HowToPlay onBack={handleBack} />
      )}
      {screen === 'ladder' && (
        <Ladder onBack={handleBack} />
      )}
      {screen === 'shop' && (
        <Shop onBack={handleBack} onLocker={() => setScreen('locker')} />
      )}
      {screen === 'locker' && (
        <Locker 
          onBack={handleBack} 
          onShop={() => setScreen('shop')} 
          onOpenCrate={handleOpenLockerCrate}
        />
      )}
      {screen === 'settings' && (
        <Settings onBack={handleBack} />
      )}

      {/* Payment Success Modal */}
      <AnimatePresence>
        {pendingCrate && (
          <CrateReadyModal
            crateType={pendingCrate.crateType}
            crateId={pendingCrate.id}
            onOpen={handleOpenCrate}
            onClose={() => setPendingCrate(null)}
          />
        )}
      </AnimatePresence>

      {/* Crate Opening Animation */}
      <AnimatePresence>
        {openingCrate && (
          <LootCrateOpening
            crateType={openingCrate.crateType}
            onComplete={handleCrateAnimationComplete}
            items={crateItems || undefined}
            onClaim={handleClaimRewards}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

export default function Home() {
  return (
    <UserProvider>
      <AudioProvider>
        <CustomizationProvider>
          <GameApp />
        </CustomizationProvider>
      </AudioProvider>
    </UserProvider>
  )
}
