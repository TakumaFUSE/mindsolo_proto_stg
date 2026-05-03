'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MentorPersona } from '@/lib/personas'

type Props = { persona: MentorPersona }

export default function PersonaCard({ persona }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/mentor-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: persona.id, is_builtin: true }),
      })
      if (!res.ok) throw new Error('failed')
      const { id } = await res.json()
      router.push(`/mentor/${id}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={loading}
      className="flex w-full flex-col gap-1 rounded-[16px] border border-[#f0cfb8] bg-[#fff9f4] p-3 text-left transition active:scale-[0.98] disabled:opacity-60"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5d5b8] text-[0.85rem] font-extrabold text-[#9b5f41]">
          {persona.avatar}
        </span>
        <div>
          <p className="text-[0.85rem] font-extrabold text-ink">{persona.name}</p>
          <p className="text-[0.68rem] font-semibold text-[#c08060]">{persona.tone}</p>
        </div>
      </div>
      <p className="text-[0.74rem] leading-snug text-muted">{persona.description}</p>
      <span className="mt-1 self-end text-[0.7rem] font-bold text-[#b87350]">
        {loading ? '準備中...' : '会話を始める →'}
      </span>
    </button>
  )
}
