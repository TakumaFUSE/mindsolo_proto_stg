'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MentorAddPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tone, setTone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !systemPrompt.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          system_prompt: systemPrompt.trim(),
          tone: tone.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      router.push('/mentor')
    } catch {
      setError('保存に失敗しました。もう一度お試しください。')
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/mentor" className="text-[0.8rem] font-bold text-[#d4956a]">
          ←
        </Link>
        <h2 className="text-[1.05rem] font-extrabold text-ink">カスタムメンターを作成</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-[0.76rem] font-bold text-[#9b5f41]">
            名前 <span className="text-[#e06b3c]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例: キャリアメンター"
            className="w-full rounded-[12px] border border-[#e8d5c4] bg-[#fdf8f4] px-3 py-2 text-[0.85rem] text-ink placeholder-[#c4a882] outline-none focus:border-[#d4956a]"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="mb-1 block text-[0.76rem] font-bold text-[#9b5f41]">
            トーン
          </label>
          <input
            type="text"
            value={tone}
            onChange={e => setTone(e.target.value)}
            placeholder="例: 励ます、論理的、温かい"
            className="w-full rounded-[12px] border border-[#e8d5c4] bg-[#fdf8f4] px-3 py-2 text-[0.85rem] text-ink placeholder-[#c4a882] outline-none focus:border-[#d4956a]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-[0.76rem] font-bold text-[#9b5f41]">
            説明
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="このメンターがどのような視点で対話するか"
            rows={2}
            className="w-full resize-none rounded-[12px] border border-[#e8d5c4] bg-[#fdf8f4] px-3 py-2 text-[0.85rem] text-ink placeholder-[#c4a882] outline-none focus:border-[#d4956a]"
          />
        </div>

        {/* System prompt */}
        <div>
          <label className="mb-1 block text-[0.76rem] font-bold text-[#9b5f41]">
            システムプロンプト <span className="text-[#e06b3c]">*</span>
          </label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="AIへの指示を書いてください。例: あなたはキャリア支援の専門家です..."
            rows={6}
            className="w-full resize-none rounded-[12px] border border-[#e8d5c4] bg-[#fdf8f4] px-3 py-2 text-[0.85rem] text-ink placeholder-[#c4a882] outline-none focus:border-[#d4956a]"
          />
        </div>

        {error && (
          <p className="text-[0.78rem] text-[#c0392b]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !systemPrompt.trim() || saving}
          className="w-full rounded-[16px] bg-[#d4956a] py-3 text-[0.88rem] font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '保存中...' : '作成する'}
        </button>
      </div>
    </div>
  )
}
