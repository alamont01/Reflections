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

        if (!response.ok) throw new Error('Failed to fetch entries')

        const data: DiaryEntry[] = await response.json()
        setEntries(data)
      } catch (error) {
        console.error('Error fetching entries:', error)
        // Handle error (e.g., show a toast notification)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntries()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No entries found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
            <p className="font-semibold">{entry.content}</p>
            <p className="text-sm text-gray-600">
              <strong>Sentiment:</strong> {entry.sentiment} | <strong>Mood:</strong> {entry.mood}
            </p>
            {entry.songName && entry.artistName && (
              <p className="text-sm text-blue-600">
                <a href={entry.songUrl} target="_blank" rel="noopener noreferrer">
                  {entry.songName} by {entry.artistName}
                </a>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
