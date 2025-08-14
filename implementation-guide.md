# Step-by-Step Implementation Guide

I'll walk you through building this diary app from scratch. Let's start!

## Phase 1: Project Setup

### Step 1: Initialize the Next.js Project

```bash
# Create new Next.js project
npx create-next-app@latest diary-mood-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd diary-mood-app
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install prisma @prisma/client next-auth @auth/prisma-adapter
npm install openai
npm install date-fns
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install lucide-react

# Dev dependencies
npm install -D @types/node prisma
```

### Step 3: Setup Shadcn/ui

```bash
npx shadcn-ui@latest init
```

When prompted, choose:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes

Install components we'll need:
```bash
npx shadcn-ui@latest add button textarea card input label
npx shadcn-ui@latest add avatar dropdown-menu
```

## Phase 2: Database Setup

### Step 4: Initialize Prisma

```bash
npx prisma init
```

### Step 5: Configure Database Schema

Replace the content of `prisma/schema.prisma`:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  entries       Entry[]
  playlists     Playlist[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Entry {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  content     String   @db.Text
  sentiment   String?  // positive, negative, neutral
  confidence  Float?
  mood        String?  // happy, sad, energetic, calm, etc.
  date        DateTime @default(now())
  songId      String?
  songName    String?
  artistName  String?
  songUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, date])
}

model Playlist {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  spotifyId   String
  name        String
  type        String   // weekly, monthly
  period      String   // e.g., "2024-W01" or "2024-01"
  url         String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, type, period])
}
```

### Step 6: Setup Database Connection

Create `lib/db.ts`:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Phase 3: Environment Variables

### Step 7: Setup Environment Variables

Create `.env.local`:

```env
# .env.local
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Spotify API
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/diary_app?schema=public"
```

**Note**: You'll need to:
1. Create a Spotify app at https://developer.spotify.com/dashboard
2. Get OpenAI API key from https://platform.openai.com/api-keys
3. Setup a PostgreSQL database (you can use Vercel Postgres, Supabase, or local PostgreSQL)

## Phase 4: Authentication Setup

### Step 8: Configure NextAuth

Create `lib/auth.ts`:

```typescript
// lib/auth.ts
import { NextAuthOptions } from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"

const scopes = [
  "user-read-email",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "user-library-read"
].join(" ")

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
```

### Step 9: Create Auth API Route

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

### Step 10: Update Next.js Types

Create `types/next-auth.d.ts`:

```typescript
// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
  }
}
```

## Phase 5: Core Services

### Step 11: Create Sentiment Analysis Service

Create `lib/sentiment.ts`:

```typescript
// lib/sentiment.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  mood: string
  explanation?: string
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Analyze the sentiment and mood of this diary entry. Respond with JSON only:
          {
            "sentiment": "positive|negative|neutral",
            "confidence": 0.0-1.0,
            "mood": "happy|sad|energetic|calm|anxious|excited|melancholy|peaceful|angry|content",
            "explanation": "brief explanation"
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return result as SentimentResult
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      mood: 'calm'
    }
  }
}
```

### Step 12: Create Spotify Service

Create `lib/spotify.ts`:

```typescript
// lib/spotify.ts
export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  external_urls: { spotify: string }
  preview_url: string | null
}

export interface SpotifyRecommendations {
  tracks: SpotifyTrack[]
}

export class SpotifyService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async getRecommendations(sentiment: string, mood: string): Promise<SpotifyTrack[]> {
    try {
      const genres = this.getGenresBySentiment(sentiment, mood)
      const features = this.getAudioFeaturesBySentiment(sentiment, mood)

      const params = new URLSearchParams({
        seed_genres: genres.slice(0, 3).join(','), // Max 3 genres
        target_valence: features.valence.toString(),
        target_energy: features.energy.toString(),
        target_danceability: features.danceability.toString(),
        limit: '10'
      })

      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`)
      }

      const data: SpotifyRecommendations = await response.json()
      return data.tracks
    } catch (error) {
      console.error('Spotify recommendations error:', error)
      return []
    }
  }

  async createPlaylist(name: string, trackIds: string[]): Promise<{ id: string; external_urls: { spotify: string } } | null> {
    try {
      // Get user profile first
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      })
      
      if (!userResponse.ok) return null
      
      const user = await userResponse.json()

      // Create playlist
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/users/${user.id}/playlists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description: 'Generated from your diary mood entries',
            public: false,
          }),
        }
      )

      if (!playlistResponse.ok) return null

      const playlist = await playlistResponse.json()

      // Add tracks to playlist
      if (trackIds.length > 0) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: trackIds.map(id => `spotify:track:${id}`)
          }),
        })
      }

      return playlist
    } catch (error) {
      console.error('Create playlist error:', error)
      return null
    }
  }

  private getGenresBySentiment(sentiment: string, mood: string): string[] {
    const genreMap: Record<string, string[]> = {
      positive: ['pop', 'indie', 'electronic', 'dance', 'funk'],
      negative: ['indie', 'alternative', 'blues', 'folk', 'ambient'],
      neutral: ['chill', 'acoustic', 'indie-folk', 'ambient', 'jazz']
    }

    const moodGenres: Record<string, string[]> = {
      happy: ['pop', 'dance', 'funk', 'disco'],
      energetic: ['electronic', 'dance', 'rock', 'pop'],
      calm: ['ambient', 'chill', 'acoustic', 'classical'],
      sad: ['blues', 'indie', 'folk', 'alternative'],
      anxious: ['ambient', 'chill', 'classical'],
      excited: ['pop', 'electronic', 'dance'],
      melancholy: ['indie', 'alternative', 'folk'],
      peaceful: ['ambient', 'classical', 'acoustic'],
      angry: ['rock', 'alternative', 'metal'],
      content: ['indie', 'folk', 'acoustic']
    }

    return [...(genreMap[sentiment] || genreMap.neutral), ...(moodGenres[mood] || [])]
  }

  private getAudioFeaturesBySentiment(sentiment: string, mood: string) {
    const baseFeatures = {
      positive: { valence: 0.7, energy: 0.6, danceability: 0.6 },
      negative: { valence: 0.3, energy: 0.4, danceability: 0.4 },
      neutral: { valence: 0.5, energy: 0.5, danceability: 0.5 }
    }

    const moodAdjustments: Record<string, Partial<{ valence: number; energy: number; danceability: number }>> = {
      energetic: { energy: 0.8, danceability: 0.7 },
      calm: { energy: 0.3, valence: 0.6 },
      excited: { energy: 0.9, valence: 0.8, danceability: 0.8 },
      sad: { valence: 0.2, energy: 0.3 },
      peaceful: { valence: 0.7, energy: 0.2 }
    }

    const base = baseFeatures[sentiment as keyof typeof baseFeatures] || baseFeatures.neutral
    const adjustments = moodAdjustments[mood] || {}

    return { ...base, ...adjustments }
  }
}
```

## Phase 6: API Routes

### Step 13: Create Sentiment Analysis API

Create `app/api/sentiment/route.ts`:

```typescript
// app/api/sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeSentiment } from '@/lib/sentiment'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const result = await analyzeSentiment(text)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    )
  }
}
```

### Step 14: Create Spotify Recommendations API

Create `app/api/spotify/recommendations/route.ts`:

```typescript
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
```

### Step 15: Create Entries API

Create `app/api/entries/route.ts`:

```typescript
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
```

## Phase 7: Frontend Components

### Step 16: Create Main Layout

Update `app/layout.tsx`:

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Diary Mood App',
  description: 'Track your daily mood and get personalized music recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### Step 17: Create Providers

Create `app/providers.tsx`:

```typescript
// app/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}
```

### Step 18: Create Sign-in Page

Create `app/auth/signin/page.tsx`:

```typescript
// app/auth/signin/page.tsx
'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignIn() {
  const router = useRouter()

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Diary Mood</CardTitle>
          <CardDescription>
            Track your daily mood and discover music that matches your feelings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => signIn('spotify', { callbackUrl: '/dashboard' })}
            className="w-full"
            size="lg"
          >
            Sign in with Spotify
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 19: Create Main Dashboard

Create `app/dashboard/page.tsx`:

```typescript
// app/dashboard/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DiaryEntry from '@/components/DiaryEntry'
import RecentEntries from '@/components/RecentEntries'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Diary Mood</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.user?.name}
              </span>
              <Button 
                variant="outline" 
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <DiaryEntry />
          </div>
          <div>
            <RecentEntries />
          </div>
        </div>
      </main>
    </div>
  )
}
```

### Step 20: Create Diary Entry Component

Create `components/DiaryEntry.tsx`:

```typescript
// components/DiaryEntry.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Music } from 'lucide-react'
import SongRecommendations from './SongRecommendations'

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  mood: string
  explanation?: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  external_urls: { spotify: string }
  preview_url: string | null
}

export default function DiaryEntry() {
  const [entry, setEntry] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null)
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([])
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleAnalyze = async () => {
    if (!entry.trim()) return

    setIsAnalyzing(true)
    setSentiment(null)
    setRecommendations([])

    try {
      // Analyze sentiment
      const sentimentResponse = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entry }),
      })

      if (!sentimentResponse.ok) throw new Error('Failed to analyze sentiment')

      const sentimentResult: SentimentResult = await sentimentResponse.json()
      setSentiment(sentimentResult)

      // Get song recommendations
      const songsResponse = await fetch('/api/spotify/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentiment: sentimentResult.sentiment, 
          mood: sentimentResult.mood 
        }),
      })

      if (!songsResponse.ok) throw new Error('Failed to get recommendations')

      const songsResult = await songsResponse.json()
      setRecommendations(songsResult.tracks || [])

    } catch (error) {
      console.error('Error:', error)
      // Handle error (you might want to show a toast notification)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!entry.trim() || !sentiment) return

    setIsSaving(true)

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: entry,
          sentiment: sentiment.sentiment,
          confidence: sentiment.confidence,
          mood: sentiment.mood,
          songId: selectedSong?.id,
          songName: selectedSong?.name,
          artistName: selectedSong?.artists[0]?.name,
          songUrl: selectedSong?.external_urls.spotify,
        }),
      })

      if (!response.ok) throw new Error('Failed to save entry')

      // Reset form
      setEntry('')
      setSentiment(null)
      setRecommendations([])
      setSelectedSong(null)

      // You might want to show a success message or refresh the recent entries

    } catch (error) {
      console.error('Error saving entry:', error)
      // Handle error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Daily Reflection
        </CardTitle>
        <CardDescription>
          Write about your day and discover music that matches your mood
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="How was your day? What are you feeling right now?"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          className="min-h-[120px]"
        />

        <Button 
          onClick={handleAnalyze}
          disabled={!entry.trim() || isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing mood...
            </>
          ) : (
            'Analyze Mood & Get Music'
          )}
        </Button>

        {sentiment && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Mood Analysis</h3>
            <div className="text-sm space-y-1">
              <p><strong>Sentiment:</strong> {sentiment.sentiment}</p>
              <p><strong>Mood:</strong> {sentiment.mood}</p>
              <p><strong>Confidence:</strong> {Math.round(sentiment.confidence * 100)}%</p>
              {sentiment.explanation && (
                <p><strong>Analysis:</strong> {sentiment.explanation}</p>
              )}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <SongRecommendations
            songs={recommendations}
            selectedSong={selectedSong}
            onSelectSong={setSelectedSong}
          />
        )}

        {sentiment && (
          <Button 
            onClick={handleSaveEntry}
            disabled={isSaving}
            className="w-full"
            variant="default"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Entry'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 21: Create Song Recommendations Component

Create `components/SongRecommendations.tsx`:

```typescript
// components/SongRecommendations.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Music, ExternalLink, Play }