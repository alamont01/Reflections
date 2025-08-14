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
