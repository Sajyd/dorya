import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { GameMode } from '@prisma/client'

// Valid game modes for scoring (FREESTYLE doesn't have a leaderboard)
const RANKED_MODES: GameMode[] = ['DORYA_STREAK', 'PEWGF_MINUTE', 'SURVIVAL']

// GET - Fetch ladder entries for a specific mode (only highest score per player)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') as GameMode | null
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!mode || !RANKED_MODES.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid or missing mode parameter' },
        { status: 400 }
      )
    }

    // Get the highest score per player for this mode using groupBy and then fetch details
    const highestScores = await prisma.ladderScore.groupBy({
      by: ['playerId'],
      where: { mode },
      _max: {
        score: true,
      },
    })

    // Now fetch the actual records with player info for these highest scores
    const scores = await prisma.ladderScore.findMany({
      where: {
        mode,
        OR: highestScores.map(hs => ({
          playerId: hs.playerId,
          score: hs._max.score!,
        })),
      },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        player: {
          select: {
            username: true,
          },
        },
      },
    })

    // Deduplicate in case of ties (same player, same max score, multiple entries)
    const seenPlayers = new Set<string>()
    const uniqueScores = scores.filter(score => {
      if (seenPlayers.has(score.playerId)) {
        return false
      }
      seenPlayers.add(score.playerId)
      return true
    })

    const entries = uniqueScores.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      username: score.player.username,
      score: score.score,
      mode: score.mode,
      createdAt: score.createdAt.toISOString(),
    }))

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Failed to fetch ladder:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ladder' },
      { status: 500 }
    )
  }
}

// POST - Submit a new score (only updates if it's a new high score for this player/mode)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      username, 
      mode, 
      score, 
      perfectInputs, 
      goodInputs, 
      missedInputs, 
      maxCombo, 
      duration 
    } = body

    // Validate required fields
    if (!username || !mode || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: username, mode, score' },
        { status: 400 }
      )
    }

    // Validate mode
    if (!RANKED_MODES.includes(mode as GameMode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be DORYA_STREAK, PEWGF_MINUTE, or SURVIVAL' },
        { status: 400 }
      )
    }

    // Validate username
    const cleanUsername = username.trim().toUpperCase().slice(0, 16)
    if (cleanUsername.length < 1) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Find or create player
    let player = await prisma.player.findUnique({
      where: { username: cleanUsername },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          username: cleanUsername,
        },
      })
    }

    // Update player stats
    await prisma.player.update({
      where: { id: player.id },
      data: {
        totalDoryas: { increment: (perfectInputs || 0) + (goodInputs || 0) },
        totalPewgfs: { increment: perfectInputs || 0 },
        totalGamesPlayed: { increment: 1 },
        totalPlayTime: { increment: duration || 0 },
      },
    })

    // Check if player already has a score for this mode
    const existingScore = await prisma.ladderScore.findFirst({
      where: {
        playerId: player.id,
        mode: mode as GameMode,
      },
      orderBy: { score: 'desc' },
    })

    let ladderScore
    let isNewHighScore = false

    if (existingScore) {
      // Only update if the new score is higher
      if (score > existingScore.score) {
        ladderScore = await prisma.ladderScore.update({
          where: { id: existingScore.id },
          data: {
            score,
            details: {
              perfectInputs,
              goodInputs,
              missedInputs,
              maxCombo,
              duration,
            },
            createdAt: new Date(), // Update timestamp for new high score
          },
        })
        isNewHighScore = true
      } else {
        ladderScore = existingScore
      }
    } else {
      // Create new ladder score entry
      ladderScore = await prisma.ladderScore.create({
        data: {
          playerId: player.id,
          mode: mode as GameMode,
          score,
          details: {
            perfectInputs,
            goodInputs,
            missedInputs,
            maxCombo,
            duration,
          },
        },
      })
      isNewHighScore = true
    }

    // Create game session record (always track individual games)
    await prisma.gameSession.create({
      data: {
        playerId: player.id,
        mode: mode as GameMode,
        score,
        perfectInputs: perfectInputs || 0,
        goodInputs: goodInputs || 0,
        missedInputs: missedInputs || 0,
        maxCombo: maxCombo || 0,
        duration: duration || 0,
      },
    })

    // Get the player's rank based on their best score
    // Count unique players with higher scores
    const playersWithHigherScores = await prisma.ladderScore.groupBy({
      by: ['playerId'],
      where: {
        mode: mode as GameMode,
      },
      _max: {
        score: true,
      },
      having: {
        score: {
          _max: {
            gt: ladderScore.score,
          },
        },
      },
    })
    const rank = playersWithHigherScores.length + 1

    return NextResponse.json({
      success: true,
      rank,
      scoreId: ladderScore.id,
      isNewHighScore,
      previousBest: existingScore?.score ?? null,
    })
  } catch (error) {
    console.error('Failed to submit score:', error)
    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500 }
    )
  }
}
