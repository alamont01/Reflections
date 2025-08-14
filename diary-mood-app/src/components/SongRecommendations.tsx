// components/SongRecommendations.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Music, ExternalLink, Play } from 'lucide-react'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  external_urls: { spotify: string }
  preview_url: string | null
}

export default function SongRecommendations({
  songs,
  selectedSong,
  onSelectSong,
}: {
  songs: SpotifyTrack[]
  selectedSong: SpotifyTrack | null
  onSelectSong: (song: SpotifyTrack) => void
}) {
  if (!songs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Song Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No recommendations available.</p>
        </CardContent>
      </Card>
    )
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
            className={`p-4 rounded-lg ${
              selectedSong?.id === song.id ? 'bg-blue-50' : 'bg-gray-50'
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
                    size="sm"
                    onClick={() => window.open(song.preview_url, '_blank')}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(song.external_urls.spotify, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectSong(song)}
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
