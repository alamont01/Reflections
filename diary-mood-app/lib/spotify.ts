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
