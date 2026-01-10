'use client'

import { Suspense, useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { DoryaAttempt, ActiveCustomization, StageItem, ElectricColorItem, CharacterItem, DummyItem } from '@/types/game'
import { STAGES, ELECTRIC_COLORS, CHARACTERS, DUMMIES } from '@/lib/customizationData'
import { useAudio, GraphicsQuality } from '@/context/AudioContext'

// Graphics quality presets
const QUALITY_SETTINGS: Record<GraphicsQuality, {
  dpr: number
  bloomIntensity: number
  bloomLuminanceThreshold: number
  shadowMapSize: number
  enableBloom: boolean
}> = {
  low: {
    dpr: 0.5,
    bloomIntensity: 0,
    bloomLuminanceThreshold: 1,
    shadowMapSize: 512,
    enableBloom: false,
  },
  medium: {
    dpr: 0.75,
    bloomIntensity: 0.3,
    bloomLuminanceThreshold: 0.8,
    shadowMapSize: 1024,
    enableBloom: true,
  },
  high: {
    dpr: 1,
    bloomIntensity: 0.6,
    bloomLuminanceThreshold: 0.7,
    shadowMapSize: 2048,
    enableBloom: true,
  },
}

interface GameSceneProps {
  isPlaying: boolean
  lastAttempt: DoryaAttempt | null
  currentStreak: number
  customization?: ActiveCustomization
  playerSide?: 'p1' | 'p2'
}

// Electric lightning bolt geometry
function createLightningBolt(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  const segments = 12
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = (Math.random() - 0.5) * 0.4
    const y = t * 1.5 - 0.75
    const z = (Math.random() - 0.5) * 0.4
    points.push(new THREE.Vector3(x, y, z))
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return geometry
}

// Electric effect around the fist - optimized for performance
function ElectricEffect({ 
  active, 
  isPerfect,
  electricColor,
  position = [0, 0, 0],
}: { 
  active: boolean
  isPerfect: boolean
  electricColor?: ElectricColorItem
  position?: [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const boltsRef = useRef<THREE.Group>(null)
  const sparksRef = useRef<THREE.Group>(null)
  const coreGlowRef = useRef<THREE.Mesh>(null)
  const outerGlowRef = useRef<THREE.Mesh>(null)
  const extraGlowRef = useRef<THREE.Mesh>(null)
  
  // Store bolt lines and spark meshes as refs to avoid re-creating
  const boltLinesRef = useRef<THREE.Line[]>([])
  const sparkMeshesRef = useRef<THREE.Mesh[]>([])
  const sparkDataRef = useRef<Array<{pos: THREE.Vector3, vel: THREE.Vector3, life: number}>>([])
  
  const isRainbow = electricColor?.id === 'electric_rainbow'
  
  // Initialize bolts and sparks once
  useEffect(() => {
    if (active) {
      // Create bolt lines if not already created
      if (boltLinesRef.current.length === 0) {
        const material = new THREE.LineBasicMaterial({ 
          color: '#ffffff', 
          linewidth: 2, 
          transparent: true, 
          opacity: 0.9 
        })
        
        for (let i = 0; i < 8; i++) {
          const geometry = createLightningBolt()
          const line = new THREE.Line(geometry, material.clone())
          boltLinesRef.current.push(line)
          boltsRef.current?.add(line)
        }
      }
      
      // Initialize spark data
      sparkDataRef.current = Array(12).fill(null).map(() => ({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        ),
        life: 1
      }))
      
      // Create spark meshes if needed
      if (sparkMeshesRef.current.length === 0) {
        const sparkGeometry = new THREE.SphereGeometry(0.03, 6, 6)
        const sparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true })
        
        for (let i = 0; i < 12; i++) {
          const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial.clone())
          sparkMeshesRef.current.push(mesh)
          sparksRef.current?.add(mesh)
        }
      }
      
      // Show bolts and sparks
      boltLinesRef.current.forEach(line => { line.visible = true })
      sparkMeshesRef.current.forEach(mesh => { mesh.visible = true })
    } else {
      // Hide bolts and sparks
      boltLinesRef.current.forEach(line => { line.visible = false })
      sparkMeshesRef.current.forEach(mesh => { mesh.visible = false })
    }
    
    return () => {
      // Cleanup on unmount
      boltLinesRef.current.forEach(line => {
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      })
      sparkMeshesRef.current.forEach(mesh => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      boltLinesRef.current = []
      sparkMeshesRef.current = []
    }
  }, [active])
  
  useFrame((state, delta) => {
    if (!active || !groupRef.current) return
    
    // Rotate the electric effect
    groupRef.current.rotation.y += 0.15
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 25) * 0.15
    
    // Calculate color
    let color: THREE.Color
    if (isPerfect) {
      color = isRainbow 
        ? new THREE.Color().setHSL((state.clock.elapsedTime * 0.4) % 1, 1, 0.6) 
        : new THREE.Color(electricColor?.primaryColor || '#ffd700')
    } else {
      color = isRainbow 
        ? new THREE.Color().setHSL((state.clock.elapsedTime * 0.4) % 1, 1, 0.5) 
        : new THREE.Color(electricColor?.primaryColor || '#00d4ff')
    }
    
    const glowColor = electricColor?.secondaryColor ? new THREE.Color(electricColor.secondaryColor) : color
    
    // Update glow colors directly (no state change)
    if (coreGlowRef.current) {
      (coreGlowRef.current.material as THREE.MeshBasicMaterial).color = color
    }
    if (outerGlowRef.current) {
      (outerGlowRef.current.material as THREE.MeshBasicMaterial).color = glowColor
    }
    if (extraGlowRef.current) {
      (extraGlowRef.current.material as THREE.MeshBasicMaterial).color = color
    }
    
    // Regenerate bolts occasionally (update geometry in place)
    if (Math.random() < 0.1) {
      boltLinesRef.current.forEach(line => {
        const newGeometry = createLightningBolt()
        line.geometry.dispose()
        line.geometry = newGeometry
        ;(line.material as THREE.LineBasicMaterial).color = color
      })
    }
    
    // Update spark particles (no state, direct mesh updates)
    sparkDataRef.current.forEach((spark, i) => {
      spark.pos.add(spark.vel.clone().multiplyScalar(delta))
      spark.vel.y -= 10 * delta
      spark.life -= delta * 2
      
      if (spark.life <= 0) {
        // Reset particle
        spark.pos.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        )
        spark.vel.set(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        )
        spark.life = 1
      }
      
      const mesh = sparkMeshesRef.current[i]
      if (mesh) {
        mesh.position.copy(spark.pos)
        mesh.scale.setScalar(spark.life)
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = spark.life * 0.8
        mat.color = color
      }
    })
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={position}>
      <group ref={boltsRef} />
      <group ref={sparksRef} />
      {/* Core glow */}
      <mesh ref={coreGlowRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      {/* Outer glow */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </mesh>
      {/* Extra large outer glow for dramatic effect */}
      <mesh ref={extraGlowRef}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

// Character model using GLB animations
function CharacterModel({
  position,
  isAttacking,
  isHit,
  side,
  isPlayer = false,
  characterCustomization,
  dummyCustomization,
  electricColor,
  isPerfect,
  attackTriggered,
  hitTriggered,
  showElectricOnAttack = true,
}: {
  position: [number, number, number]
  isAttacking: boolean
  isHit: boolean
  side: 'left' | 'right'
  isPlayer?: boolean
  characterCustomization?: CharacterItem
  dummyCustomization?: DummyItem
  electricColor?: ElectricColorItem
  isPerfect?: boolean
  attackTriggered?: number
  hitTriggered?: number
  showElectricOnAttack?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const uppercutActionRef = useRef<THREE.AnimationAction | null>(null)
  const idleActionRef = useRef<THREE.AnimationAction | null>(null)
  const rightHandBoneRef = useRef<THREE.Bone | null>(null)
  const [showElectric, setShowElectric] = useState(false)
  const [electricPosition, setElectricPosition] = useState<[number, number, number]>([0.5, 2.0, 0.3])
  
  // Animation state for dummy launch
  const animationState = useRef({
    launchHeight: 0,
    launchVelocity: 0,
    isLaunching: false,
    hitPhase: 0,
  })

  // Quaternions for rotation (avoids gimbal lock)
  const targetQuaternion = useRef(new THREE.Quaternion())
  const launchQuaternion = useRef(new THREE.Quaternion())

  // Determine model path
  const isMirrorStyle = dummyCustomization?.style === 'shadow' || dummyCustomization?.style === 'hologram'
  const modelPath = isPlayer 
    ? (characterCustomization?.modelPath || '/assets/models/characters/mishimaclassic.glb')
    : (isMirrorStyle 
        ? (characterCustomization?.modelPath || '/assets/models/characters/mishimaclassic.glb')
        : (dummyCustomization?.modelPath || '/assets/models/dummies/classicopponent.glb'))

  const { scene, animations } = useGLTF(modelPath)
  
  // Clone scene for this instance using SkeletonUtils for proper animation support
  const clonedScene = useMemo(() => {
    // SkeletonUtils.clone properly clones skinned meshes and their skeleton bindings
    // Regular scene.clone(true) doesn't properly handle skeleton bindings for animations
    const clone = SkeletonUtils.clone(scene) as THREE.Group
    
    clone.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // Apply material modifications for special styles
        if (!isPlayer && dummyCustomization) {
          if (dummyCustomization.style === 'hologram') {
            child.material = (child.material as THREE.Material).clone()
            const mat = child.material as THREE.MeshStandardMaterial
            mat.transparent = true
            mat.opacity = 0.6
            mat.color = new THREE.Color(dummyCustomization.skinColor)
            mat.emissive = new THREE.Color(dummyCustomization.skinColor)
            mat.emissiveIntensity = 0.3
          } else if (dummyCustomization.style === 'shadow') {
            child.material = (child.material as THREE.Material).clone()
            const mat = child.material as THREE.MeshStandardMaterial
            mat.transparent = true
            mat.opacity = 0.4
            mat.color = new THREE.Color('#111111')
          }
        }
      } else if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      
      // Find right hand bone for electric effect attachment
      if (isPlayer && child instanceof THREE.Bone) {
        const boneName = child.name.toLowerCase()
        // Log all bone names on first load for debugging
        if (!rightHandBoneRef.current) {
          console.log('Bone found:', child.name)
        }
        // Look for right hand bone (common naming conventions)
        if (boneName.includes('hand.r') ||
            boneName.includes('hand_r') ||
            boneName.includes('righthand') ||
            boneName.includes('right_hand') ||
            boneName === 'mixamorigrighthand' ||
            (boneName.includes('hand') && (boneName.includes('.r') || boneName.includes('_r') || boneName.startsWith('r_') || boneName.endsWith('_r')))) {
          console.log('Found right hand bone:', child.name)
          rightHandBoneRef.current = child
        }
      }
    })
    return clone
  }, [scene, side, dummyCustomization])

  // Setup animation mixer and actions
  useEffect(() => {
    if (clonedScene && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clonedScene)
      mixerRef.current = mixer
      
      // Log available animations for debugging
      console.log(`[${side}] Available animations:`, animations.map(a => a.name))
      
      if (isPlayer) {
        // Player character - find uppercut animation
        const uppercutClip = animations[0]
        
        if (uppercutClip) {
          console.log(`[${side}] Using animation:`, uppercutClip.name)
          const action = mixer.clipAction(uppercutClip)
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          uppercutActionRef.current = action
          
          // Set to first frame as idle pose
          action.reset()
          action.enabled = true
          action.time = 0
          action.paused = true
          action.play()
          mixer.update(0)
        }
      } else {
        // Dummy - find idle animation
        const idleClip = animations[0]
        
        if (idleClip) {
          console.log(`[${side}] Using idle animation:`, idleClip.name)
          const action = mixer.clipAction(idleClip)
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.play()
          idleActionRef.current = action
        }
      }
      
      return () => {
        mixer.stopAllAction()
        mixerRef.current = null
      }
    }
  }, [clonedScene, animations, side])

  // Handle attack trigger - play uppercut animation
  useEffect(() => {
    if (attackTriggered && isPlayer && uppercutActionRef.current && mixerRef.current) {
      const action = uppercutActionRef.current
      
      console.log('Playing uppercut animation')
      
      // Stop and fully reset the action
      action.stop()
      action.reset()
      
      // Ensure the action is properly enabled and has correct time scale (2x speed)
      action.enabled = true
      action.paused = false
      action.timeScale = 2
      action.setEffectiveTimeScale(2)
      action.setEffectiveWeight(1)
      action.time = 0
      
      // Play the animation
      action.play()
      
      // Force an immediate mixer update to initialize bindings
      mixerRef.current.update(0)
      
      console.log(action, "action after playing")
      
      // Show electric effect during punch only if it's a successful hit (adjusted for 2x speed)
      const electricTimer = setTimeout(() => {
        if (showElectricOnAttack) {
          setShowElectric(true)
        }
      }, 75)
      
      // Hide electric effect and return to idle pose (adjusted for 2x speed)
      const hideTimer = setTimeout(() => {
        setShowElectric(false)
      }, 300)
      
      // Return to first frame (idle pose) after animation (adjusted for 2x speed)
      const resetTimer = setTimeout(() => {
        if (action && mixerRef.current) {
          // Stop the action and reset to first frame
          action.stop()
          action.reset()
          action.time = 0
          action.paused = true
          action.enabled = true
          // Play paused to show first frame pose
          action.play()
          action.paused = true
          mixerRef.current.update(0)
        }
      }, 400)
      
      return () => {
        clearTimeout(electricTimer)
        clearTimeout(hideTimer)
        clearTimeout(resetTimer)
      }
    }
  }, [attackTriggered, side])

  // Handle hit - launch the dummy or juggle if already in air
  useEffect(() => {
    if (hitTriggered && hitTriggered > 0 && !isPlayer) {
      const anim = animationState.current
      
      if (anim.isLaunching && anim.launchHeight > 0) {
        // Juggle! Add velocity to keep them in the air
        anim.launchVelocity = Math.max(anim.launchVelocity, 0) + 6
      } else {
        // Initial launch
        anim.isLaunching = true
        anim.launchVelocity = 10
        anim.hitPhase = 0
      }
      
      // Pause idle animation during launch
      if (idleActionRef.current) {
        idleActionRef.current.paused = true
      }
    }
  }, [hitTriggered, side])

  // Determine face rotation based on side and dummy type
  // Default dummy (training_dummy style - punching bag) faces camera, others face left
  const isPunchingBag = dummyCustomization?.style === 'training_dummy'
  
  // Adjust Y position for dummy to be on ground (compensate for model origin)
  // Classic opponent model has a different origin point and needs a higher offset
  // Shadow/hologram use character models which also need no offset (same as combat robot)
  const isClassicOpponentModel = dummyCustomization?.style === 'classic'
  const yOffset = !isPlayer ? (isClassicOpponentModel ? 1.5 : 0) : 0

  useFrame((state, delta) => {
    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
    
    // Track right hand bone position for electric effect
    if (isPlayer && rightHandBoneRef.current && showElectric) {
      const worldPos = new THREE.Vector3()
      rightHandBoneRef.current.getWorldPosition(worldPos)
      
      // Convert to local coordinates relative to the group
      if (groupRef.current) {
        groupRef.current.worldToLocal(worldPos)
      }
      
      setElectricPosition([worldPos.x, worldPos.y, worldPos.z])
    }
    
    if (!groupRef.current) return
    
    const anim = animationState.current
    
    if (!isPlayer) {
      // DUMMY/OPPONENT - handle launch physics
      const baseY = position[1] + yOffset // Account for ground offset
      
      // Classic opponent model faces the right direction by default, no Y rotation needed
      // Other dummies: rotate to face the player (left side)
      const targetRotationY = isClassicOpponentModel ? 0 : (isPunchingBag ? Math.PI : -Math.PI * 0.5)
      
      // Set the base target quaternion (standing upright, facing correct direction)
      targetQuaternion.current.setFromEuler(new THREE.Euler(0, targetRotationY, 0))
      
      if (anim.isLaunching) {
        anim.hitPhase += delta
        anim.launchVelocity -= 22 * delta // Gravity
        anim.launchHeight += anim.launchVelocity * delta
        
        // Calculate tilt angle for backward rotation around waist
        const tiltAngle = -Math.min(anim.hitPhase * 2, Math.PI * 0.5)
        
        // Waist pivot height (scaled model waist is around 1.5 units up)
        const waistHeight = 1.5
        
        if (isClassicOpponentModel) {
          // Classic opponent: simple euler rotation (no Y rotation, just Z tilt around waist)
          groupRef.current.rotation.set(0, 0, tiltAngle)
          
          // Offset position to rotate around waist pivot
          const pivotOffsetX = waistHeight * Math.sin(-tiltAngle)
          const pivotOffsetY = waistHeight * (1 - Math.cos(tiltAngle))
          groupRef.current.position.set(
            position[0] + pivotOffsetX,
            baseY + Math.max(0, anim.launchHeight) + pivotOffsetY,
            position[2]
          )
        } else {
          // Other dummies: use quaternion to combine Y rotation with Z tilt around waist
          const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tiltAngle)
          launchQuaternion.current.copy(targetQuaternion.current).premultiply(tiltQuat)
          groupRef.current.quaternion.copy(launchQuaternion.current)
          
          // Calculate pivot offset in world space, then rotate by Y to get local offset
          const pivotOffsetLocal = new THREE.Vector3(waistHeight * Math.sin(-tiltAngle), waistHeight * (1 - Math.cos(tiltAngle)), 0)
          pivotOffsetLocal.applyQuaternion(targetQuaternion.current)
          groupRef.current.position.set(
            position[0] + pivotOffsetLocal.x,
            baseY + Math.max(0, anim.launchHeight) + pivotOffsetLocal.y,
            position[2] + pivotOffsetLocal.z
          )
        }
        
        if (anim.launchHeight < 0 && anim.launchVelocity < 0) {
          anim.isLaunching = false
          anim.launchHeight = 0
          // Resume idle animation
          if (idleActionRef.current) {
            idleActionRef.current.paused = false
          }
        }
      } else if (isClassicOpponentModel) {
        // Classic opponent: simple euler recovery
        const needsRecovery = groupRef.current.position.y > baseY + 0.01 || 
                              Math.abs(groupRef.current.rotation.z) > 0.01 ||
                              Math.abs(groupRef.current.position.x - position[0]) > 0.01
        if (needsRecovery) {
          groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], delta * 5)
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseY, delta * 3)
          groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 5)
        } else {
          groupRef.current.position.set(position[0], baseY, position[2])
          groupRef.current.rotation.set(0, 0, 0)
        }
      } else {
        // Other dummies: quaternion slerp back to upright position
        const needsRecovery = groupRef.current.position.y > baseY + 0.01 || 
                              !groupRef.current.quaternion.equals(targetQuaternion.current) ||
                              Math.abs(groupRef.current.position.x - position[0]) > 0.01 ||
                              Math.abs(groupRef.current.position.z - position[2]) > 0.01
        if (needsRecovery) {
          groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], delta * 5)
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseY, delta * 3)
          groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], delta * 5)
          groupRef.current.quaternion.slerp(targetQuaternion.current, delta * 5)
        } else {
          groupRef.current.position.set(position[0], baseY, position[2])
          groupRef.current.quaternion.copy(targetQuaternion.current)
        }
      }
    }
  })

  const glowColor = isPlayer ? characterCustomization?.glowColor : undefined
  const isDummyHologram = !isPlayer && dummyCustomization?.style === 'hologram'
  
  const faceRotation = side === 'left' 
    ? Math.PI * 0.5 
    : isClassicOpponentModel
      ? 0 // Classic opponent already faces correct direction
    : isPunchingBag 
      ? Math.PI // Face camera
        : -Math.PI * 0.5 // Face left toward player

  const adjustedPosition: [number, number, number] = [position[0], position[1] + yOffset, position[2]]

  return (
    <group
      ref={groupRef}
      position={adjustedPosition}
      rotation={[0, faceRotation, 0]}
    >
      {/* Character glow effect */}
      {glowColor && isPlayer && (
        <pointLight position={[0, 1.5, 0]} intensity={0.8} color={glowColor} distance={4} />
      )}
      
      {/* Hologram effect */}
      {isDummyHologram && (
        <pointLight position={[0, 1.5, 0]} intensity={0.5} color={dummyCustomization?.skinColor || '#00ffff'} distance={3} />
      )}
      
      {/* The 3D Model - scaled up */}
      <group ref={modelRef} scale={[1.8, 1.8, 1.8]}>
        <primitive object={clonedScene} />
      </group>
        
      {/* Electric effect at fist position */}
      {isPlayer && showElectric && (
        <ElectricEffect 
          active={true} 
          isPerfect={isPerfect || false}
          electricColor={electricColor}
          position={electricPosition}
        />
      )}
    </group>
  )
}

// Impact spark effect - optimized for performance
function ImpactEffect({ active, position, color = '#ffd700' }: { active: boolean; position: [number, number, number]; color?: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const particleDataRef = useRef<Array<{
    position: THREE.Vector3
    velocity: THREE.Vector3
    scale: number
    life: number
  }>>([])
  const isActiveRef = useRef(false)
  const particleCount = 15

  // Initialize particle meshes once
  useEffect(() => {
    if (groupRef.current && meshesRef.current.length === 0) {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshBasicMaterial({ color, transparent: true })
      
      for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(geometry, material.clone())
        mesh.visible = false
        meshesRef.current.push(mesh)
        groupRef.current.add(mesh)
      }
    }
    
    return () => {
      meshesRef.current.forEach(mesh => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      meshesRef.current = []
    }
  }, [color])

  // Reset particles when becoming active
  useEffect(() => {
    if (active && !isActiveRef.current) {
      isActiveRef.current = true
      
      particleDataRef.current = Array(particleCount).fill(null).map(() => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 5
        ),
        scale: 0.08 + Math.random() * 0.15,
        life: 1,
      }))
      
      meshesRef.current.forEach(mesh => { mesh.visible = true })
    } else if (!active) {
      isActiveRef.current = false
    }
  }, [active])

  useFrame((state, delta) => {
    if (!isActiveRef.current) return
    
    let anyVisible = false
    
    particleDataRef.current.forEach((p, i) => {
      if (p.life <= 0 || p.scale <= 0.01) {
        if (meshesRef.current[i]) {
          meshesRef.current[i].visible = false
        }
        return
      }
      
      anyVisible = true
      
      // Update particle physics
      p.position.add(p.velocity.clone().multiplyScalar(delta))
      p.velocity.y -= 12 * delta
      p.scale *= 0.96
      p.life -= delta * 1.5
      
      // Update mesh directly
      const mesh = meshesRef.current[i]
      if (mesh) {
        mesh.position.copy(p.position)
        mesh.scale.setScalar(p.scale)
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.9
      }
    })
    
    if (!anyVisible) {
      isActiveRef.current = false
      meshesRef.current.forEach(mesh => { mesh.visible = false })
    }
  })

  return <group ref={groupRef} position={position} />
}

// Arena floor with grid
function Arena({ stageCustomization }: { stageCustomization?: StageItem }) {
  const floorColor = stageCustomization?.floorColor || '#0a0a0a'
  const gridColor = stageCustomization?.gridColor || '#1a1a3a'
  const accentColor = stageCustomization?.accentColor || '#00d4ff'
  
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color={floorColor} 
          metalness={0.8} 
          roughness={0.3}
        />
      </mesh>
      
      {/* Grid lines */}
      <gridHelper 
        args={[30, 30, gridColor, gridColor]} 
        position={[0, 0.01, 0]}
      />
      
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3, 3.15, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} />
      </mesh>
      
      {/* Additional accent rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.5, 4.6, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

// Screen shake effect
function ScreenShake({ intensity }: { intensity: number }) {
  const { camera } = useThree()
  const originalPosition = useRef(new THREE.Vector3())
  
  useEffect(() => {
    originalPosition.current.copy(camera.position)
  }, [camera])
  
  useFrame(() => {
    if (intensity > 0) {
      camera.position.x = originalPosition.current.x + (Math.random() - 0.5) * intensity * 0.15
      camera.position.y = originalPosition.current.y + (Math.random() - 0.5) * intensity * 0.15
    } else {
      camera.position.lerp(originalPosition.current, 0.1)
    }
  })
  
  return null
}

// Loading fallback
function ModelLoadingFallback({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
    }
  })
  
  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.8, 1.8, 0.8]} />
      <meshBasicMaterial color="#444444" wireframe />
    </mesh>
  )
}

// Main scene component
function Scene({ isPlaying, lastAttempt, currentStreak, customization, qualitySettings, playerSide = 'p1' }: GameSceneProps & { qualitySettings?: typeof QUALITY_SETTINGS['high'] }) {
  const [isAttacking, setIsAttacking] = useState(false)
  const [isHit, setIsHit] = useState(false)
  const [showImpact, setShowImpact] = useState(false)
  const [shakeIntensity, setShakeIntensity] = useState(0)
  const [isPerfect, setIsPerfect] = useState(false)
  const [attackTrigger, setAttackTrigger] = useState(0)
  const [hitTrigger, setHitTrigger] = useState(0)
  const [shouldShowElectric, setShouldShowElectric] = useState(false)
  
  // Get customization with defaults
  const stage = customization?.stage || STAGES[0]
  const electricColor = customization?.electricColor || ELECTRIC_COLORS[0]
  const character = customization?.character || CHARACTERS[0]
  const dummy = customization?.dummy || DUMMIES[0]
  
  // Swap positions based on player side (P2 = player on right, opponent on left)
  const playerX = playerSide === 'p1' ? -1.8 : 1.8
  const opponentX = playerSide === 'p1' ? 1.8 : -1.8
  
  // Handle attempt results - trigger animation on ANY attempt including misses
  useEffect(() => {
    if (lastAttempt) {
      const isSuccess = lastAttempt.result === 'perfect' || lastAttempt.result === 'good' || lastAttempt.result === 'bad'
      const isMissWithValidMotion = lastAttempt.result === 'miss' && lastAttempt.validMotion === true
      setIsPerfect(lastAttempt.result === 'perfect')
      
      // Trigger attack animation on success OR miss with valid WGF motion (f, n, d, df+2)
      if (isSuccess || isMissWithValidMotion) {
        setIsAttacking(true)
        setAttackTrigger(prev => prev + 1)
        
        // Only show electric effect on successful hits (not on miss)
        setShouldShowElectric(isSuccess)
        
        // Only trigger hit reaction on successful hits (not on miss)
        if (isSuccess) {
          setTimeout(() => {
            setIsHit(true)
            setHitTrigger(prev => prev + 1)
            setShowImpact(true)
            setShakeIntensity(lastAttempt.result === 'perfect' ? 2.0 : 1.0)
          }, 100) // Adjusted for 2x speed
        }
      }
      
      // Reset states
      setTimeout(() => {
        setIsAttacking(false)
        setIsHit(false)
        setShowImpact(false)
        setShakeIntensity(0)
        setShouldShowElectric(false)
      }, 1500)
    }
  }, [lastAttempt])

  const impactColor = isPerfect ? '#ffd700' : (electricColor?.primaryColor || '#00d4ff')
  const fogColor = stage?.fogColor || '#000000'
  const spotlightColor = stage?.spotlightColor || '#ffffff'
  const ambientColor = stage?.ambientLight || '#303030'
  const accentColor = stage?.accentColor || '#00d4ff'

  return (
    <>
      {/* Camera positioned for larger model view */}
      <PerspectiveCamera makeDefault position={[0, 2.2, 5]} fov={55} />
      
      <ambientLight intensity={0.4} color={ambientColor} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize={[qualitySettings?.shadowMapSize || 2048, qualitySettings?.shadowMapSize || 2048]}
      />
      <pointLight position={[-4, 4, 3]} intensity={0.6} color={accentColor} />
      <pointLight position={[4, 4, 3]} intensity={0.6} color="#9d4edd" />
      
      {/* Spotlight on characters */}
      <spotLight
        position={[0, 10, 2]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.2}
        color={spotlightColor}
        castShadow
      />
      
      <Arena stageCustomization={stage} />
      
      {/* Player character */}
      <Suspense fallback={<ModelLoadingFallback position={[playerX, 0, 0]} />}>
        <CharacterModel 
          position={[playerX, 0, 0]} 
          isAttacking={isAttacking}
          isHit={false}
          side={playerSide === 'p1' ? 'left' : 'right'}
          isPlayer={true}
          characterCustomization={character}
          electricColor={electricColor}
          isPerfect={isPerfect}
          attackTriggered={attackTrigger}
          showElectricOnAttack={shouldShowElectric}
        />
      </Suspense>
      
      {/* Opponent character */}
      <Suspense fallback={<ModelLoadingFallback position={[opponentX, 0, 0]} />}>
        <CharacterModel 
          position={[opponentX, 0, 0]} 
          isAttacking={false}
          isHit={isHit}
          hitTriggered={hitTrigger}
          side={playerSide === 'p1' ? 'right' : 'left'}
          isPlayer={false}
          characterCustomization={character}
          dummyCustomization={dummy}
        />
      </Suspense>
      
      {/* Impact effect */}
      <ImpactEffect active={showImpact} position={[0.5, 2.5, 0]} color={impactColor} />
      
      <ScreenShake intensity={shakeIntensity} />
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={[fogColor, 6, 30]} />
    </>
  )
}

// FPS limiter component - caps rendering at 60fps
function FPSLimiter() {
  const { invalidate } = useThree()
  const lastFrameTime = useRef(0)
  const frameInterval = 1000 / 60 // 60fps = ~16.67ms per frame

  useEffect(() => {
    let animationId: number

    const loop = (time: number) => {
      animationId = requestAnimationFrame(loop)
      
      const delta = time - lastFrameTime.current
      if (delta >= frameInterval) {
        lastFrameTime.current = time - (delta % frameInterval)
        invalidate()
      }
    }

    animationId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationId)
  }, [invalidate, frameInterval])

  return null
}

export default function GameScene(props: GameSceneProps) {
  const { settings } = useAudio()
  const qualitySettings = QUALITY_SETTINGS[settings.graphicsQuality]
  
  // Rainbow effect gets slightly boosted bloom if enabled
  const bloomIntensity = qualitySettings.enableBloom 
    ? (props.customization?.electricColor?.id === 'electric_rainbow' 
        ? qualitySettings.bloomIntensity * 1.33 
        : qualitySettings.bloomIntensity)
    : 0
  
  return (
    <Canvas 
      shadows={settings.graphicsQuality !== 'low'} 
      className="!absolute !inset-0" 
      frameloop="demand"
      dpr={qualitySettings.dpr}
      gl={{ 
        antialias: settings.graphicsQuality !== 'low',
        powerPreference: settings.graphicsQuality === 'low' ? 'low-power' : 'high-performance',
      }}
    >
      <FPSLimiter />
      <Suspense fallback={null}>
        <Scene {...props} qualitySettings={qualitySettings} playerSide={props.playerSide} />
        
        {/* Post-processing effects - disabled on low quality */}
        {qualitySettings.enableBloom && (
          <EffectComposer>
            <Bloom 
              intensity={bloomIntensity}
              luminanceThreshold={qualitySettings.bloomLuminanceThreshold}
              luminanceSmoothing={0.9}
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  )
}
