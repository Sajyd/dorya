'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useCustomization, CrateResultItem } from '@/lib/customizationContext'
import { useUser } from '@/context/UserContext'
import {
  STAGES,
  ELECTRIC_COLORS,
  CHARACTERS,
  DUMMIES,
  LOOT_CRATES,
  RARITY_COLORS,
  RARITY_GLOW,
} from '@/lib/customizationData'
import { ShopItem, CrateType, ItemCategory } from '@/types/game'
import LootCrateOpening from './LootCrateOpening'

interface ShopProps {
  onBack: () => void
  onLocker: () => void
}

type ShopTab = 'crates' | 'stages' | 'effects' | 'characters' | 'dummies'

const TAB_LABELS: Record<ShopTab, string> = {
  crates: 'LOOT CRATES',
  stages: 'STAGES',
  effects: 'EFFECTS',
  characters: 'CHARACTERS',
  dummies: 'DUMMIES',
}

export default function Shop({ onBack, onLocker }: ShopProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>('crates')
  const [openingCrate, setOpeningCrate] = useState<CrateType | null>(null)
  const [crateResults, setCrateResults] = useState<CrateResultItem[] | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [purchasingCrate, setPurchasingCrate] = useState<CrateType | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const { user, isLoggedIn } = useUser()

  const {
    currency,
    ownsItem,
    purchaseItem,
    openCrate,
  } = useCustomization()

  const handleBuyCrate = async (crateType: CrateType) => {
    const crate = LOOT_CRATES.find(c => c.id === crateType)
    if (!crate || currency.doryaCoins < crate.price) return
    
    // Roll items FIRST, then start the animation with items
    const results = await openCrate(crateType)
    if (results) {
      setCrateResults(results)
      setOpeningCrate(crateType)
    }
  }

  const handleBuyCrateWithStripe = async (crateType: CrateType) => {
    // Require authenticated (non-guest) login for real money purchases
    if (!isLoggedIn) {
      setPurchaseError('You must sign up or log in to purchase with real money. This ensures your items are saved to your account.')
      setShowPremiumModal(true)
      return
    }

    setPurchasingCrate(crateType)
    setPurchaseError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crateType,
          username: user.username,
        }),
      })

      const data = await res.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      setPurchaseError('Failed to start checkout. Please try again.')
      setShowPremiumModal(true)
    } finally {
      setPurchasingCrate(null)
    }
  }

  const handleCrateAnimationComplete = () => {
    // Animation complete - items were already rolled in handleBuyCrate
    // This is called when the animation finishes (for cases without items)
  }

  const handleClaimRewards = () => {
    // Rewards already added to inventory when openCrate was called
    setOpeningCrate(null)
    setCrateResults(null)
  }

  const handleCloseCrateResults = () => {
    setOpeningCrate(null)
    setCrateResults(null)
  }

  const handlePurchaseItem = async (item: ShopItem) => {
    if (ownsItem(item.id)) return
    if (currency.doryaCoins < item.price) {
      setSelectedItem(item)
      setShowPremiumModal(true)
      return
    }
    await purchaseItem(item)
  }

  const getItemsForTab = (): ShopItem[] => {
    switch (activeTab) {
      case 'stages': return STAGES.filter(s => s.price > 0)
      case 'effects': return ELECTRIC_COLORS.filter(e => e.price > 0)
      case 'characters': return CHARACTERS.filter(c => c.price > 0)
      case 'dummies': return DUMMIES.filter(d => d.price > 0)
      default: return []
    }
  }
  
  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-gray-950" />
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
      style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)`,
          }}
        />
      </div>
      
      {/* Header */}
      <motion.div
        className="relative z-10 p-3 md:p-6 border-b border-gray-800"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 md:gap-6">
            <button
              className="text-gray-400 hover:text-white transition-colors font-tekken tracking-wider text-sm md:text-base"
              onClick={onBack}
            >
              ← BACK
            </button>
            <h1 className="font-display text-2xl md:text-4xl text-tekken-gold">SHOP</h1>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-6">
            {/* Currency Display */}
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-4 md:py-2 bg-gray-900/80 rounded-lg border border-gray-700">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
                <span className="font-tekken text-sm md:text-xl text-tekken-gold">{currency.doryaCoins.toLocaleString()}</span>
              </div>
            </div>
            
            <button
              className="menu-button py-1.5 px-3 md:py-2 md:px-6 !text-xs md:!text-lg w-auto"
              onClick={onLocker}
            >
              LOCKER
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="relative z-10 border-b border-gray-800 overflow-x-auto scrollbar-hide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-0 md:gap-1 max-w-6xl mx-auto px-3 md:px-6 min-w-max">
          {(Object.keys(TAB_LABELS) as ShopTab[]).map((tab) => (
            <button
              key={tab}
              className={`px-3 py-2 md:px-6 md:py-3 font-tekken tracking-wider transition-all relative text-xs md:text-base whitespace-nowrap ${
                activeTab === tab
                  ? 'text-tekken-gold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
              {activeTab === tab && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-tekken-gold"
                  layoutId="activeTab"
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'crates' ? (
              <motion.div
                key="crates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
              >
                {LOOT_CRATES.map((crate) => (
                  <motion.div
                    key={crate.id}
                    className={`relative p-4 md:p-6 rounded-xl border-2 bg-gray-900/50 backdrop-blur transition-all hover:scale-105 ${
                      crate.id === 'legendary'
                        ? 'border-tekken-gold'
                        : crate.id === 'premium'
                        ? 'border-purple-500'
                        : 'border-gray-700'
                    }`}
                    whileHover={{ y: -5 }}
                  >
                    {crate.id === 'legendary' && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-tekken-gold/20 to-transparent pointer-events-none" />
                    )}
                    
                    <div className="relative">
                      {/* Crate Icon */}
                      <div className="text-center mb-3 md:mb-4">
                        <motion.div
                          className="inline-block text-4xl md:text-6xl"
                          animate={{ 
                            rotateY: [0, 10, -10, 0],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        >
                          {crate.id === 'legendary' ? '🎁' : crate.id === 'premium' ? '📦' : '📦'}
                        </motion.div>
                      </div>

                      <h3 className={`font-display text-lg md:text-2xl text-center mb-1 md:mb-2 ${
                        crate.id === 'legendary'
                          ? 'text-tekken-gold'
                          : crate.id === 'premium'
                          ? 'text-purple-400'
                          : 'text-white'
                      }`}>
                        {crate.name}
                      </h3>
                      
                      <p className="text-gray-400 text-xs md:text-sm text-center mb-3 md:mb-4">
                        {crate.description}
                      </p>

                      <div className="space-y-2">
                        {/* Buy with Dorya Coins */}
                        <button
                          className={`w-full py-2 md:py-3 px-3 md:px-4 rounded-lg font-tekken tracking-wider transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
                            currency.doryaCoins >= crate.price
                              ? 'bg-tekken-gold text-black hover:bg-yellow-400'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                          onClick={() => handleBuyCrate(crate.id)}
                          disabled={currency.doryaCoins < crate.price}
                        >
                          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex-shrink-0" />
                          <span>{crate.price.toLocaleString()}</span>
                        </button>
                        
                        {/* Buy with Real Money (Stripe) - requires login */}
                        <button
                          className={`w-full py-1.5 md:py-2 px-3 md:px-4 rounded-lg font-tekken tracking-wider text-xs md:text-sm border transition-all flex items-center justify-center gap-2 ${
                            purchasingCrate === crate.id
                              ? 'bg-purple-900/50 text-purple-400 border-purple-700 cursor-wait'
                              : !isLoggedIn
                                ? 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed'
                                : 'bg-purple-900/50 text-purple-400 border-purple-700 hover:bg-purple-900'
                          }`}
                          onClick={() => handleBuyCrateWithStripe(crate.id)}
                          disabled={purchasingCrate === crate.id}
                          title={!isLoggedIn ? 'Sign up or log in to purchase with real money' : undefined}
                        >
                          {purchasingCrate === crate.id ? (
                            <>
                              <motion.div
                                className="w-3 h-3 md:w-4 md:h-4 border-2 border-purple-400 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              <span>PROCESSING...</span>
                            </>
                          ) : !isLoggedIn ? (
                            <>
                              <span>🔒</span>
                              <span>LOGIN TO BUY</span>
                            </>
                          ) : (
                            <>
                              <span>💳</span>
                              <span>${(crate.premiumPrice / 100).toFixed(2)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
              >
                {getItemsForTab().map((item, index) => {
                  const owned = ownsItem(item.id)
                  const canAfford = currency.doryaCoins >= item.price
                  
                  return (
                    <motion.div
                      key={item.id}
                      className={`relative p-2 md:p-4 rounded-xl border-2 bg-gray-900/50 backdrop-blur transition-all ${
                        owned
                          ? 'border-green-500/50 opacity-75'
                          : `border-gray-700 hover:border-opacity-100`
                      }`}
                      style={{
                        borderColor: owned ? undefined : RARITY_COLORS[item.rarity],
                        boxShadow: owned ? undefined : `0 0 20px ${RARITY_GLOW[item.rarity]}`,
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={owned ? {} : { scale: 1.02, y: -2 }}
                    >
                      {/* Rarity Badge */}
                      <div
                        className="absolute top-1 right-1 md:top-2 md:right-2 px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-tekken uppercase"
                        style={{
                          backgroundColor: `${RARITY_COLORS[item.rarity]}20`,
                          color: RARITY_COLORS[item.rarity],
                        }}
                      >
                        {item.rarity}
                      </div>

                      {owned && (
                        <div className="absolute top-1 left-1 md:top-2 md:left-2 text-green-400 text-sm md:text-lg">✓</div>
                      )}

                      {/* Item Preview */}
                      <div className="aspect-square mb-2 md:mb-3 rounded-lg bg-black/50 flex items-center justify-center overflow-hidden">
                        <ItemPreview item={item} />
                      </div>

                      <h4 className="font-tekken text-xs md:text-sm text-white truncate mb-1 md:mb-2">
                        {item.name}
                      </h4>

                      {!owned && (
                        <button
                          className={`w-full py-1.5 md:py-2 px-2 md:px-3 rounded-lg font-tekken tracking-wider text-xs md:text-sm transition-all flex items-center justify-center gap-1 md:gap-2 ${
                            canAfford
                              ? 'bg-electric-blue text-black hover:bg-cyan-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                          onClick={() => handlePurchaseItem(item)}
                        >
                          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex-shrink-0" />
                          <span>{item.price.toLocaleString()}</span>
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Loot Crate Opening Animation - now with integrated item reveal */}
      <AnimatePresence>
        {openingCrate && (
          <LootCrateOpening
            crateType={openingCrate}
            onComplete={handleCrateAnimationComplete}
            items={crateResults || undefined}
            onClaim={handleClaimRewards}
          />
        )}
      </AnimatePresence>

      {/* Premium Purchase Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowPremiumModal(false)
              setPurchaseError(null)
            }}
          >
            <motion.div
              className="bg-gray-900 p-4 md:p-8 rounded-2xl border-2 border-purple-500 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl md:text-3xl text-purple-400 mb-3 md:mb-4">
                {purchaseError ? 'OOPS!' : 'NEED MORE COINS?'}
              </h3>
              
              {purchaseError ? (
                <div className="mb-4 md:mb-6">
                  <p className="text-red-400 text-sm md:text-base mb-3">{purchaseError}</p>
                  {!isLoggedIn && (
                    <p className="text-gray-500 text-xs md:text-sm">
                      Go to Settings → Account to sign up or log in.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 mb-4 md:mb-6 text-sm md:text-base">
                  {!isLoggedIn 
                    ? 'Please sign up or log in to purchase items with real money.'
                    : 'You can buy loot crates directly with real money, or earn Dorya Coins by playing!'}
                </p>
              )}
              
              {!purchaseError && isLoggedIn && (
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  <p className="text-gray-500 text-xs md:text-sm">Quick purchase options:</p>
                  {LOOT_CRATES.map(crate => (
                    <button
                      key={crate.id}
                      className="w-full p-3 md:p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-purple-600 transition-all flex items-center justify-between"
                      onClick={() => {
                        setShowPremiumModal(false)
                        handleBuyCrateWithStripe(crate.id)
                      }}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-xl md:text-2xl">
                          {crate.id === 'legendary' ? '🎁' : '📦'}
                        </span>
                        <span className="font-tekken text-white text-sm md:text-base">{crate.name}</span>
                      </div>
                      <span className="text-purple-400 font-tekken text-sm md:text-base">
                        ${(crate.premiumPrice / 100).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                className="w-full py-2.5 md:py-3 px-4 md:px-6 rounded-lg bg-gray-700 text-gray-400 font-tekken hover:bg-gray-600 transition-all text-sm md:text-base"
                onClick={() => {
                  setShowPremiumModal(false)
                  setPurchaseError(null)
                }}
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Item preview component
function ItemPreview({ item }: { item: ShopItem }) {
  switch (item.category) {
    case 'stage':
      return (
        <div 
          className="w-full h-full rounded-lg"
          style={{ 
            background: `linear-gradient(to bottom, ${item.accentColor}20, ${item.floorColor})`,
          }}
        >
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(${item.gridColor}40 1px, transparent 1px),
                linear-gradient(90deg, ${item.gridColor}40 1px, transparent 1px)
              `,
              backgroundSize: '10px 10px',
            }}
          />
        </div>
      )
    
    case 'electric_color':
      return (
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: item.primaryColor }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${item.primaryColor}, ${item.secondaryColor})`,
              boxShadow: `0 0 20px ${item.primaryColor}`,
            }}
          />
        </div>
      )
    
    case 'character':
    case 'dummy':
      // Use image if available, otherwise fall back to silhouette
      if (item.preview) {
        const isShadow = item.category === 'dummy' && item.style === 'shadow'
        const isHologram = item.category === 'dummy' && item.style === 'hologram'
        
        return (
          <div className="relative w-full h-full">
            <Image
              src={item.preview}
              alt={item.name}
              fill
              className={`object-contain ${isHologram ? 'opacity-60' : ''}`}
              sizes="(max-width: 768px) 100px, 150px"
              style={isShadow ? { filter: 'brightness(0)' } : undefined}
            />
            {/* Shadow overlay */}
            {isShadow && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.7)',
                  mixBlendMode: 'multiply'
                }}
              />
            )}
            {/* Hologram glow effect */}
            {isHologram && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  boxShadow: 'inset 0 0 40px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.4)',
                  background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 255, 255, 0.1) 100%)'
                }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {/* Character glow */}
            {item.category === 'character' && item.glowColor && (
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{ boxShadow: `inset 0 0 30px ${item.glowColor}40` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        )
      }
      // Fallback to silhouette
      return (
        <div className="relative">
          <div
            className="w-12 h-20 rounded-t-full"
            style={{ backgroundColor: item.skinColor }}
          />
          <div
            className="w-16 h-12 rounded-lg -mt-4"
            style={{ backgroundColor: item.clothColor }}
          />
          {item.category === 'character' && item.glowColor && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ boxShadow: `0 0 20px ${item.glowColor}` }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      )
    
    default:
      return null
  }
}
