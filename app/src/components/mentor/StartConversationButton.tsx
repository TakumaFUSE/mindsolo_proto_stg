'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { mentorId: string }

export default function StartConversationButton({ mentorId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/mentor-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: mentorId, is_builtin: false }),
      })
      const { id } = await res.json()
      router.push(`/mentor/${id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-2 w-full rounded-full bg-[#f5d5b8] py-1 text-[0.74rem] font-bold text-[#9b5f41] disabled:opacity-50"
    >
      {loading ? '...' : '会話を始める'}
    </button>
  )
}
