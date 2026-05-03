'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import type { MentorThreadView, MentorMessage } from '@/lib/types'
import MessageBubble from '@/components/mentor/MessageBubble'
import StreamingBubble from '@/components/mentor/StreamingBubble'
import ComposerBar from '@/components/mentor/ComposerBar'
import Link from 'next/link'

export default function MentorThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const [thread, setThread] = useState<MentorThreadView | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/mentor',
        body: { thread_id: threadId },
      }),
    [threadId],
  )

  const { messages, sendMessage, status, setMessages, error } = useChat({ transport })

  useEffect(() => {
    fetch(`/api/mentor-threads/${threadId}`)
      .then(r => r.json())
      .then(
        ({ thread: t, messages: hist }: { thread: MentorThreadView; messages: MentorMessage[] }) => {
          setThread(t)
          setMessages(
            hist.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            })),
          )
          setLoading(false)
        },
      )
      .catch(() => setLoading(false))
  }, [threadId, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, status])

  const isProcessing = status === 'submitted' || status === 'streaming'

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4956a] border-t-transparent" />
      </div>
    )
  }

  if (!thread) {
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
          {thread.mentor_avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.85rem] font-extrabold text-ink">{thread.mentor_name}</p>
          {thread.title && (
            <p className="truncate text-[0.7rem] text-muted">{thread.title}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => {
            const text = msg.parts.filter(isTextUIPart).map(p => p.text).join('')
            const isStreaming =
              status === 'streaming' && i === messages.length - 1 && msg.role === 'assistant'

            if (isStreaming) {
              return <StreamingBubble key={msg.id} text={text} />
            }
            return (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                text={text}
              />
            )
          })}

          {/* Thinking dots while waiting for first chunk */}
          {status === 'submitted' && (
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

          {/* Error toast */}
          {error && (
            <p className="rounded-[12px] bg-[#fff0ee] px-3 py-2 text-center text-[0.74rem] text-[#c0392b]">
              エラーが発生しました。もう一度お試しください。
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <ComposerBar onSend={text => sendMessage({ text })} disabled={isProcessing} />
    </div>
  )
}
