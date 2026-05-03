'use client'

import { useState, useEffect } from 'react'
import type { RelatedEntry } from '@/lib/entry'

export type GeneratedData = {
  summary: string | null
  interpretation: string | null
  related: RelatedEntry[]
  insight: string | null
}

type Result = GeneratedData & {
  isStreaming: boolean
  error: string | null
}

export function useEntryGeneration(
  entryId: string,
  initial: GeneratedData,
  skip: boolean,
): Result {
  const [data, setData] = useState<GeneratedData>(initial)
  const [isStreaming, setIsStreaming] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (skip) return

    const es = new EventSource(`/api/entries/${entryId}/generate`)

    es.addEventListener('summary', (e: MessageEvent) => {
      const { value } = JSON.parse(e.data) as { value: string }
      setData(prev => ({ ...prev, summary: value }))
    })

    es.addEventListener('interpretation', (e: MessageEvent) => {
      const { value } = JSON.parse(e.data) as { value: string }
      setData(prev => ({ ...prev, interpretation: value }))
    })

    es.addEventListener('insight', (e: MessageEvent) => {
      const { value } = JSON.parse(e.data) as { value: string }
      setData(prev => ({ ...prev, insight: value }))
    })

    es.addEventListener('related', (e: MessageEvent) => {
      const { value } = JSON.parse(e.data) as { value: RelatedEntry[] }
      setData(prev => ({ ...prev, related: value }))
    })

    es.addEventListener('done', () => {
      setIsStreaming(false)
      es.close()
    })

    es.onerror = () => {
      setIsStreaming(false)
      setError('生成に失敗しました。再度お試しください。')
      es.close()
    }

    return () => es.close()
  }, [entryId, skip])

  return { ...data, isStreaming, error }
}
