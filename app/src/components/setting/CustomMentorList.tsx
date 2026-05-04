'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CustomMentor } from '@/lib/types'

type Props = { initialMentors: CustomMentor[] }

export default function CustomMentorList({ initialMentors }: Props) {
  const [mentors, setMentors] = useState(initialMentors)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/mentors/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMentors(prev => prev.filter(m => m.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-[16px] border border-[#ede3d8] bg-white px-4 py-3">
      <h2 className="mb-3 text-[0.88rem] font-extrabold text-ink">カスタムメンター</h2>

      {mentors.length === 0 ? (
        <p className="text-[0.78rem] text-muted">カスタムメンターはまだありません</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mentors.map(mentor => (
            <div
              key={mentor.id}
              className="flex items-center gap-3 rounded-[12px] border border-[#f0e6da] bg-[#fdf8f4] px-3 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5d5b8] text-[0.8rem] font-extrabold text-[#9b5f41]">
                {mentor.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-bold text-ink">{mentor.name}</p>
                {mentor.description && (
                  <p className="truncate text-[0.7rem] text-muted">{mentor.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link
                  href={`/mentor/add?id=${mentor.id}`}
                  className="rounded-[8px] border border-[#ede3d8] bg-white px-2.5 py-1 text-[0.7rem] font-bold text-[#d4956a]"
                >
                  編集
                </Link>
                <button
                  onClick={() => handleDelete(mentor.id, mentor.name)}
                  disabled={deletingId === mentor.id}
                  className="rounded-[8px] border border-[#f0d0c8] bg-[#fff4f2] px-2.5 py-1 text-[0.7rem] font-bold text-[#c0392b] disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/mentor/add"
        className="mt-3 flex items-center justify-center gap-1 rounded-[12px] border border-dashed border-[#d4956a] py-2 text-[0.78rem] font-bold text-[#d4956a]"
      >
        + 新しいメンターを作成
      </Link>
    </div>
  )
}
