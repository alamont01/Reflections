// components/RecentEntries.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface DiaryEntry {
  id: string
  content: string
  sentiment: string
  mood: string
  date: string
  songName?: string
  artistName?: string
  songUrl?: string
}

export default function RecentEntries() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/entries', {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch entries')
        }

        const data: DiaryEntry[] = await response.json()
        setEntries(data)
      } catch (error) {
        console.error('Error fetching entries:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntries()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-600">No entries found. Start by writing your first diary entry!</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
              <p className="mt-2">{entry.content}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  <strong>Sentiment:</strong> {entry.sentiment}
                </p>
                <p>
                  <strong>Mood:</strong> {entry.mood}
                </p>
                {entry.songName && (
                  <p>
                    <strong>Song:</strong>{' '}
                    <a
                      href={entry.songUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {entry.songName} by {entry.artistName}
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
