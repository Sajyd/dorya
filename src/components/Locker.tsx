'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useCustomization } from '@/lib/customizationContext'
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
import { ShopItem, ItemCategory, CrateType } from '@/types/game'

interface PendingCrate {
  id: string
  crateType: CrateType
}

interface LockerProps {
  onBack: () => void
  onShop: () => void
  onOpenCrate?: (crate: PendingCrate) => void
}

type LockerTab = 'crates' | 'stages' | 'effects' | 'characters' | 'dummies'

const TAB_LABELS: Record<LockerTab, string> = {
  crates: 'MY CRATES',
  stages: 'STAGES',
  effects: 'EFFECTS',
  characters: 'CHARACTERS',
  dummies: 'DUMMIES',
}

interface UnopenedCrate {
  id: string
  crateType: CrateType
  purchasedAt: string
}

export default function Locker({ onBack, onShop, onOpenCrate }: LockerProps) {
  const [activeTab, setActiveTab] = useState<LockerTab>('crates')
  const [unopenedCrates, setUnopenedCrates] = useState<UnopenedCrate[]>([])
  const [loadingCrates, setLoadingCrates] = useState(true)
  const { user } = useUser()

  const {
    currency,
    inventory,
    ownsItem,
    selectStage,
    selectElectricColor,
    selectCharacter,
    selectDummy,
    activeCustomization,
  } = useCustomization()

  // Fetch unopened crates
  useEffect(() => {
    if (user?.username) {
      setLoadingCrates(true)
      fetch(`/api/crates?username=${user.username}`)
        .then(res => res.json())
        .then(data => {
          setUnopenedCrates(data.crates || [])
        })
        .catch(err => {
          console.error('Failed to fetch crates:', err)
        })
        .finally(() => {
          setLoadingCrates(false)
        })
    } else {
      setUnopenedCrates([])
      setLoadingCrates(false)
    }
  }, [user?.username])

  const getItemsForTab = (): { items: ShopItem[]; selected: string } => {
    switch (activeTab) {
      case 'stages':
        return {
          items: STAGES.filter(s => ownsItem(s.id)),
          selected: inventory.selectedStage,
        }
      case 'effects':
        return {
          items: ELECTRIC_COLORS.filter(e => ownsItem(e.id)),
          selected: inventory.selectedElectricColor,
        }
      case 'characters':
        return {
          items: CHARACTERS.filter(c => ownsItem(c.id)),
          selected: inventory.selectedCharacter,
        }
      case 'dummies':
        return {
          items: DUMMIES.filter(d => ownsItem(d.id)),
          selected: inventory.selectedDummy,
        }
      default:
        return { items: [], selected: '' }
    }
  }

  const handleSelect = (item: ShopItem) => {
    switch (item.category) {
      case 'stage':
        selectStage(item.id)
        break
      case 'electric_color':
        selectElectricColor(item.id)
        break
      case 'character':
        selectCharacter(item.id)
        break
      case 'dummy':
        selectDummy(item.id)
        break
    }
  }

  const handleOpenCrate = (crate: UnopenedCrate) => {
    if (onOpenCrate) {
      onOpenCrate({
        id: crate.id,
        crateType: crate.crateType as CrateType,
      })
      // Remove from local state
      setUnopenedCrates(prev => prev.filter(c => c.id !== crate.id))
    }
  }

  const { items, selected } = activeTab !== 'crates' ? getItemsForTab() : { items: [], selected: '' }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-gray-950" />
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)`,
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
            <h1 className="font-display text-2xl md:text-4xl text-electric-blue">MY LOCKER</h1>
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
              className="menu-button py-1.5 px-3 md:py-2 md:px-6 !text-xs md:!text-lg w-auto border-tekken-gold text-tekken-gold hover:bg-tekken-gold hover:text-black"
              onClick={onShop}
            >
              SHOP
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
          {(Object.keys(TAB_LABELS) as LockerTab[]).map((tab) => (
            <button
              key={tab}
              className={`px-3 py-2 md:px-6 md:py-3 font-tekken tracking-wider transition-all relative flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap ${
                activeTab === tab
                  ? 'text-electric-blue'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
              {tab === 'crates' && unopenedCrates.length > 0 && (
                <motion.span
                  className="px-1.5 md:px-2 py-0.5 rounded-full bg-tekken-gold text-black text-[10px] md:text-xs font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  {unopenedCrates.length}
                </motion.span>
              )}
              {activeTab === tab && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-blue"
                  layoutId="activeLockerTab"
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-4xl">
            <AnimatePresence mode="wait">
              {activeTab === 'crates' ? (
                <motion.div
                  key="crates"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {loadingCrates ? (
                    <div className="flex items-center justify-center py-12 md:py-20">
                      <motion.div
                        className="w-6 h-6 md:w-8 md:h-8 border-2 border-electric-blue border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  ) : unopenedCrates.length === 0 ? (
                    <div className="text-center py-12 md:py-20">
                      <div className="text-4xl md:text-6xl mb-3 md:mb-4">📦</div>
                      <p className="text-gray-500 font-tekken text-base md:text-xl mb-2">No crates to open</p>
                      <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6">
                        Purchase crates from the shop to get exclusive items!
                      </p>
                      <button
                        className="text-tekken-gold hover:underline font-tekken text-sm md:text-base"
                        onClick={onShop}
                      >
                        Visit the Shop →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {unopenedCrates.map((crate, index) => {
                        const crateInfo = LOOT_CRATES.find(c => c.id === crate.crateType)
                        if (!crateInfo) return null

                        const crateColors = {
                          basic: { primary: '#6b7280', secondary: '#374151', glow: 'rgba(107, 114, 128, 0.5)' },
                          premium: { primary: '#a855f7', secondary: '#7c3aed', glow: 'rgba(168, 85, 247, 0.6)' },
                          legendary: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)' },
                        }
                        const colors = crateColors[crate.crateType as keyof typeof crateColors]

                        return (
                          <motion.div
                            key={crate.id}
                            className="relative rounded-xl border-2 overflow-hidden cursor-pointer group"
                            style={{
                              borderColor: colors.primary,
                              background: 'linear-gradient(to bottom, #1a1a2e, #0a0a12)',
                            }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            onClick={() => handleOpenCrate(crate)}
                          >
                            {/* Glow effect */}
                            <motion.div
                              className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: `radial-gradient(ellipse at center, ${colors.glow}, transparent 60%)` }}
                            />

                            <div className="relative p-4 md:p-6">
                              {/* Crate icon */}
                              <motion.div
                                className="relative w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                <div
                                  className="absolute -inset-2 rounded-xl"
                                  style={{ background: `radial-gradient(circle, ${colors.glow}, transparent 60%)` }}
                                />
                                <div
                                  className="relative w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center text-3xl md:text-5xl"
                                  style={{
                                    background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
                                    boxShadow: `0 0 30px ${colors.glow}`,
                                  }}
                                >
                                  {crate.crateType === 'legendary' ? '🎁' : '📦'}
                                </div>

                                {/* Sparkles */}
                                {crate.crateType !== 'basic' && (
                                  <>
                                    {[...Array(4)].map((_, i) => (
                                      <motion.div
                                        key={i}
                                        className="absolute w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                                        style={{
                                          backgroundColor: colors.primary,
                                          left: `${10 + Math.random() * 80}%`,
                                          top: `${10 + Math.random() * 80}%`,
                                        }}
                                        animate={{
                                          opacity: [0, 1, 0],
                                          scale: [0, 1, 0],
                                        }}
                                        transition={{
                                          duration: 1.5,
                                          repeat: Infinity,
                                          delay: i * 0.3,
                                        }}
                                      />
                                    ))}
                                  </>
                                )}
                              </motion.div>

                              {/* Crate info */}
                              <div className="text-center">
                                <h3
                                  className="font-display text-base md:text-xl mb-1"
                                  style={{ color: colors.primary }}
                                >
                                  {crateInfo.name}
                                </h3>
                                <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4">
                                  {crateInfo.itemCount} item{crateInfo.itemCount > 1 ? 's' : ''}
                                </p>

                                {/* Open button */}
                                <motion.div
                                  className="py-2 px-4 md:py-3 md:px-6 rounded-lg font-tekken tracking-wider text-xs md:text-sm"
                                  style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    color: crate.crateType === 'legendary' ? '#000' : '#fff',
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  OPEN CRATE
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
                >
                  {items.length === 0 ? (
                    <div className="col-span-full text-center py-8 md:py-12">
                      <p className="text-gray-500 font-tekken text-base md:text-xl mb-3 md:mb-4">No items yet</p>
                      <button
                        className="text-electric-blue hover:underline text-sm md:text-base"
                        onClick={onShop}
                      >
                        Visit the Shop →
                      </button>
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const isSelected = item.id === selected
                      
                      return (
                        <motion.button
                          key={item.id}
                          className={`relative p-2 md:p-4 rounded-xl border-2 bg-gray-900/50 backdrop-blur transition-all text-left ${
                            isSelected
                              ? 'border-electric-blue'
                              : 'border-gray-700 hover:border-gray-500'
                          }`}
                          style={{
                            boxShadow: isSelected ? `0 0 20px rgba(0, 212, 255, 0.4)` : undefined,
                          }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelect(item)}
                        >
                          {/* Selected Badge */}
                          {isSelected && (
                            <motion.div
                              className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-electric-blue rounded-full flex items-center justify-center text-black text-xs md:text-sm"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring' }}
                            >
                              ✓
                            </motion.div>
                          )}

                          {/* Rarity indicator */}
                          <div
                            className="absolute top-1.5 left-1.5 md:top-2 md:left-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                            style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                          />

                          {/* Item Preview */}
                          <div className="aspect-square mb-2 md:mb-3 rounded-lg bg-black/50 flex items-center justify-center overflow-hidden">
                            <ItemPreview item={item} />
                          </div>

                          <h4 className="font-tekken text-xs md:text-sm text-white truncate">
                            {item.name}
                          </h4>
                          <p
                            className="text-[10px] md:text-xs uppercase"
                            style={{ color: RARITY_COLORS[item.rarity] }}
                          >
                            {item.rarity}
                          </p>
                        </motion.button>
                      )
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Preview Panel */}
        <motion.div
          className="w-80 border-l border-gray-800 p-6 hidden lg:block"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-tekken text-gray-400 text-sm mb-4">CURRENT LOADOUT</h3>
          
          <div className="space-y-4">
            <LoadoutPreviewItem
              label="STAGE"
              item={activeCustomization.stage}
            />
            <LoadoutPreviewItem
              label="ELECTRIC"
              item={activeCustomization.electricColor}
            />
            <LoadoutPreviewItem
              label="CHARACTER"
              item={activeCustomization.character}
            />
            <LoadoutPreviewItem
              label="DUMMY"
              item={activeCustomization.dummy}
            />
          </div>

          {/* Mini Scene Preview */}
          <div className="mt-6 aspect-video rounded-xl overflow-hidden bg-black border border-gray-700">
            <div
              className="w-full h-full relative"
              style={{
                background: `linear-gradient(to bottom, ${activeCustomization.stage.accentColor}20, ${activeCustomization.stage.floorColor})`,
              }}
            >
              {/* Grid */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(${activeCustomization.stage.gridColor}40 1px, transparent 1px),
                    linear-gradient(90deg, ${activeCustomization.stage.gridColor}40 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
              
              {/* Characters */}
              <div className="absolute bottom-0 left-1/4 transform -translate-x-1/2 w-16 h-24">
                {activeCustomization.character.preview ? (
                  <Image
                    src={activeCustomization.character.preview}
                    alt={activeCustomization.character.name}
                    fill
                    className="object-contain object-bottom"
                    sizes="64px"
                  />
                ) : (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                    <div
                      className="w-8 h-12 rounded-t-full"
                      style={{ backgroundColor: activeCustomization.character.skinColor }}
                    />
                    <div
                      className="w-10 h-6 rounded-lg -mt-2"
                      style={{ backgroundColor: activeCustomization.character.clothColor }}
                    />
                  </div>
                )}
              </div>
              
              <div className="absolute bottom-0 right-1/4 transform translate-x-1/2 w-16 h-24">
                {activeCustomization.dummy.preview ? (
                  <Image
                    src={activeCustomization.dummy.preview}
                    alt={activeCustomization.dummy.name}
                    fill
                    className="object-contain object-bottom"
                    sizes="64px"
                  />
                ) : (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                    <div
                      className="w-8 h-12 rounded-t-full"
                      style={{ backgroundColor: activeCustomization.dummy.skinColor }}
                    />
                    <div
                      className="w-10 h-6 rounded-lg -mt-2"
                      style={{ backgroundColor: activeCustomization.dummy.clothColor }}
                    />
                  </div>
                )}
              </div>

              {/* Electric effect preview */}
              <motion.div
                className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full"
                style={{
                  backgroundColor: activeCustomization.electricColor.primaryColor,
                  boxShadow: `0 0 15px ${activeCustomization.electricColor.primaryColor}`,
                }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function LoadoutPreviewItem({ label, item }: { label: string; item: ShopItem }) {
  const showImage = (item.category === 'character' || item.category === 'dummy') && item.preview

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
      <div className="w-10 h-10 rounded-lg bg-black/50 flex items-center justify-center overflow-hidden relative">
        {showImage ? (
          <Image
            src={item.preview!}
            alt={item.name}
            fill
            className="object-contain"
            sizes="40px"
          />
        ) : (
        <ItemPreview item={item} small />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white text-sm truncate">{item.name}</p>
      </div>
    </div>
  )
}

function ItemPreview({ item, small = false }: { item: ShopItem; small?: boolean }) {
  const size = small ? 'w-6 h-6' : 'w-full h-full'
  
  switch (item.category) {
    case 'stage':
      return (
        <div
          className={`${size} rounded-lg`}
          style={{
            background: `linear-gradient(to bottom, ${item.accentColor}40, ${item.floorColor})`,
          }}
        />
      )
    
    case 'electric_color':
      return (
        <motion.div
          className={`${small ? 'w-4 h-4' : 'w-10 h-10'} rounded-full`}
          style={{
            background: `radial-gradient(circle, ${item.primaryColor}, ${item.secondaryColor})`,
            boxShadow: `0 0 10px ${item.primaryColor}`,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )
    
    case 'character':
    case 'dummy':
      // Use image if available
      if (item.preview && !small) {
        const isShadow = item.category === 'dummy' && item.style === 'shadow'
        const isHologram = item.category === 'dummy' && item.style === 'hologram'
        
        return (
          <div className="relative w-full h-full">
            <Image
              src={item.preview}
              alt={item.name}
              fill
              className={`object-contain ${isHologram ? 'opacity-60' : ''}`}
              sizes="(max-width: 768px) 80px, 120px"
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
          </div>
        )
      }
      // Fallback to silhouette (or for small previews)
      return (
        <div className="relative">
          <div
            className={`${small ? 'w-4 h-6' : 'w-8 h-12'} rounded-t-full`}
            style={{ backgroundColor: item.skinColor }}
          />
          <div
            className={`${small ? 'w-5 h-3' : 'w-10 h-6'} rounded-lg ${small ? '-mt-1' : '-mt-2'}`}
            style={{ backgroundColor: item.clothColor }}
          />
        </div>
      )
    
    default:
      return null
  }
}
