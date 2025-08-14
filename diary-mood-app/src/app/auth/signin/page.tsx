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
