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
