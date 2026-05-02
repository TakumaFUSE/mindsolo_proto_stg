'use client'
import { useEffect, useRef, useState } from 'react'

type Props = {
  isOpen: boolean
  content: string
}

export default function AssistantPromptCard({ isOpen, content }: Props) {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!isOpen || loadedRef.current) return
    loadedRef.current = true

    let cancelled = false
    setIsLoading(true)
    setQuestion('')

    ;(async () => {
      try {
        const resp = await fetch('/api/ask-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() || 'ジャーナルの新しいエントリ' }),
        })

        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break
          setQuestion(q => q + decoder.decode(value, { stream: !done }))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, content])

  if (!isOpen) return null

  return (
    <div className="mb-3 rounded-[18px] border border-[#bde4dd] bg-gradient-to-br from-[#ecfcf8] to-white p-3">
      <h3 className="mb-2 text-[0.92rem] font-extrabold text-ink">AIからの問いかけ</h3>
      {isLoading && !question ? (
        <div className="space-y-1.5">
          <div className="h-2.5 w-full animate-pulse rounded bg-[#c6ede8]" />
          <div className="h-2.5 w-4/5 animate-pulse rounded bg-[#c6ede8]" />
        </div>
      ) : (
        <p className="text-[0.84rem] leading-relaxed text-[#5d5048]">{question}</p>
      )}
    </div>
  )
}
