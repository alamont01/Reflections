// app/api/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, sentiment, confidence, mood, songId, songName, artistName, songUrl } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const entry = await prisma.entry.create({
      data: {
        userId: user.id,
        content,
        sentiment,
        confidence,
        mood,
        songId,
        songName,
        artistName,
        songUrl,
      }
    })

    return NextResponse.json(entry)
    
  } catch (error) {
    console.error('Create entry error:', error)
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const entries = await prisma.entry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 50, // Limit to recent entries
    })

    return NextResponse.json(entries)
    
  } catch (error) {
    console.error('Get entries error:', error)
    return NextResponse.json(
      { error: 'Failed to get entries' },
      { status: 500 }
    )
  }
}
