import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET - Fetch player profile and stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    const player = await prisma.player.findUnique({
      where: { username: username.toUpperCase() },
      include: {
        ladderScores: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        gameHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Get best scores for each mode
    const bestScores = await prisma.ladderScore.groupBy({
      by: ['mode'],
      where: { playerId: player.id },
      _max: { score: true },
    })

    // Get rankings for each mode
    const rankings: Record<string, number> = {}
    for (const best of bestScores) {
      if (best._max.score) {
        const rank = await prisma.ladderScore.count({
          where: {
            mode: best.mode,
            score: { gt: best._max.score },
          },
        })
        rankings[best.mode] = rank + 1
      }
    }

    return NextResponse.json({
      id: player.id,
      username: player.username,
      stats: {
        totalDoryas: player.totalDoryas,
        totalPewgfs: player.totalPewgfs,
        totalGamesPlayed: player.totalGamesPlayed,
        totalPlayTime: player.totalPlayTime,
      },
      bestScores: bestScores.map(b => ({
        mode: b.mode,
        score: b._max.score,
        rank: rankings[b.mode] || null,
      })),
      recentGames: player.gameHistory.map(g => ({
        id: g.id,
        mode: g.mode,
        score: g.score,
        perfectInputs: g.perfectInputs,
        goodInputs: g.goodInputs,
        missedInputs: g.missedInputs,
        maxCombo: g.maxCombo,
        duration: g.duration,
        createdAt: g.createdAt.toISOString(),
      })),
      createdAt: player.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch player:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    )
  }
}

