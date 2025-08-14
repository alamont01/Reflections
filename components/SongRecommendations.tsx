// components/SongRecommendations.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Music, ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  external_urls: { spotify: string }
  preview_url: string | null
}

interface SongRecommendationsProps {
  songs: SpotifyTrack[]
  selectedSong: SpotifyTrack | null
  onSelectSong: (song: SpotifyTrack) => void
}

export default function SongRecommendations({
  songs,
  selectedSong,
  onSelectSong,
}: SongRecommendationsProps) {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)

  const handlePlayPreview = (previewUrl: string | null) => {
    if (!previewUrl) return
    const audio = new Audio(previewUrl)
    audio.play()
    setPlayingPreview(previewUrl)

    audio.onended = () => {
      setPlayingPreview(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Song Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {songs.map((song) => (
          <div
            key={song.id}
            className={`p-4 border rounded-lg ${
              selectedSong?.id === song.id ? 'border-blue-500' : 'border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{song.name}</h3>
                <p className="text-sm text-gray-600">
                  {song.artists.map((artist) => artist.name).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {song.preview_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlayPreview(song.preview_url)}
                  >
                    <Play
                      className={`h-4 w-4 ${
                        playingPreview === song.preview_url ? 'text-blue-500' : ''
                      }`}
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={song.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <Button
              onClick={() => onSelectSong(song)}
              className="mt-2 w-full"
              variant={selectedSong?.id === song.id ? 'default' : 'outline'}
            >
              {selectedSong?.id === song.id ? 'Selected' : 'Select'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
