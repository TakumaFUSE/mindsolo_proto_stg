'use client'

import { useState } from 'react'
import type { ReflectionSuggestion } from '@/lib/types'

type Props = { suggestions: ReflectionSuggestion[] }

export default function SuggestionRail({ suggestions }: Props) {
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(suggestions.filter(s => s.read_at).map(s => s.id)),
  )

  if (suggestions.length === 0) return null

  function markRead(id: string) {
    setReadIds(prev => new Set([...prev, id]))
    // TODO: persist read_at to Supabase
  }

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[0.95rem] font-extrabold text-ink">振り返りの提案</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {suggestions.map(s => {
          const isRead = readIds.has(s.id)
          return (
            <button
              key={s.id}
              onClick={() => markRead(s.id)}
              className={[
                'min-w-[200px] max-w-[240px] shrink-0 rounded-2xl border p-3 text-left transition-all',
                isRead
                  ? 'border-[#ddd0c6] bg-gradient-to-br from-[#f5f1ee] to-[#f9f7f5] opacity-60'
                  : 'border-[#f2c7ae] bg-gradient-to-br from-[#fff7ef] to-white shadow-[var(--shadow-card)]',
              ].join(' ')}
            >
              <p className="mb-1 line-clamp-3 text-[0.86rem] font-extrabold leading-snug text-ink">
                {s.content}
              </p>
              {isRead && (
                <span className="mt-1 block text-[0.7rem] text-[#9b8f87]">既読</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
