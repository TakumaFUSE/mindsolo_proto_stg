'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import type { MentorThreadView, MentorMessage } from '@/lib/types'
import MessageBubble from '@/components/mentor/MessageBubble'
import ComposerBar from '@/components/mentor/ComposerBar'
import Link from 'next/link'

type ThreadData = {
  thread: MentorThreadView
  messages: MentorMessage[]
}

export default function MentorThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const [data, setData] = useState<ThreadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/mentor-threads/${threadId}`)
      .then(r => r.json())
      .then((d: ThreadData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages, streamingText])

  async function handleSend(text: string) {
    if (!data || sending) return
    setSending(true)

    const userMsg: MentorMessage = {
      id: `local-${Date.now()}`,
      thread_id: threadId,
      role: 'user',
      content: text,
      image_urls: [],
      created_at: new Date().toISOString(),
    }
    setData(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev)

    try {
      const res = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          content: text,
          persona_id: data.thread.persona_id,
          is_builtin: data.thread.is_builtin,
          mentor_id: data.thread.mentor_id,
        }),
      })

      if (!res.ok || !res.body) throw new Error('failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''

      setStreamingText('')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value)
        setStreamingText(full)
      }

      const assistantMsg: MentorMessage = {
        id: `local-${Date.now()}-a`,
        thread_id: threadId,
        role: 'assistant',
        content: full,
        image_urls: [],
        created_at: new Date().toISOString(),
      }
      setData(prev =>
        prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev,
      )
      setStreamingText('')
    } catch {
      setStreamingText('')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4956a] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
        <p className="text-[0.82rem] text-muted">スレッドが見つかりません</p>
        <Link href="/mentor" className="text-[0.78rem] font-bold text-[#d4956a]">
          ← メンター一覧へ
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#ede3d8] px-4 py-3">
        <Link href="/mentor" className="text-[0.8rem] font-bold text-[#d4956a]">
          ←
        </Link>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5d5b8] text-[0.82rem] font-extrabold text-[#9b5f41]">
          {data.thread.mentor_avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.85rem] font-extrabold text-ink">{data.thread.mentor_name}</p>
          {data.thread.title && (
            <p className="truncate text-[0.7rem] text-muted">{data.thread.title}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {data.messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming bubble */}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-[16px] rounded-bl-[4px] border border-[#ede3d8] bg-white px-3 py-2 text-[0.82rem] leading-relaxed text-ink">
                {streamingText}
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[#d4956a]" />
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {sending && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-[16px] rounded-bl-[4px] border border-[#ede3d8] bg-white px-3 py-2">
                <span className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a882]"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <ComposerBar onSend={handleSend} disabled={sending} />
    </div>
  )
}
