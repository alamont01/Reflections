// app/api/spotify/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SpotifyService } from '@/lib/spotify'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sentiment, mood } = await request.json()

    const spotifyService = new SpotifyService(session.accessToken)
    const recommendations = await spotifyService.getRecommendations(sentiment, mood)

    return NextResponse.json({ tracks: recommendations })
    
  } catch (error) {
    console.error('Spotify recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
