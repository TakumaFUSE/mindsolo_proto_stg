'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Editor from './Editor'
import ImageUploader, { type ImageUploaderHandle } from './ImageUploader'
import AssistantPromptCard from './AssistantPromptCard'

type Props = { initialChainId: string | null }

export default function WriteClient({ initialChainId }: Props) {
  const router = useRouter()
  const uploaderRef = useRef<ImageUploaderHandle>(null)

  const [content, setContent] = useState('')
  const [deepMemo, setDeepMemo] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!content.trim() || isSaving) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const body = new FormData()
      body.append(
        'content',
        deepMemo.trim() ? `${content}\n\n---\n\n${deepMemo}` : content,
      )
      if (initialChainId) body.append('parent_chain_id', initialChainId)
      images.forEach(img => body.append('images', img))

      const res = await fetch('/api/entries', { method: 'POST', body })
      if (!res.ok) throw new Error('保存に失敗しました')
      const { id } = await res.json()
      router.push(`/entry/${id}`)
    } catch {
      setSaveError('保存に失敗しました。もう一度お試しください。')
      setIsSaving(false)
    }
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header: cancel / save */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => router.push('/feed')}
          className="rounded-[12px] border border-[#e9d9cc] bg-white px-4 py-2 text-[0.86rem] font-semibold text-ink transition hover:-translate-y-px"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim() || isSaving}
          className="rounded-[12px] border border-[#df5d2f] bg-gradient-to-b from-[#ef7a4a] to-[#e56033] px-4 py-2 text-[0.86rem] font-bold text-white shadow-[0_8px_17px_rgba(221,95,50,0.27)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {saveError && (
        <p className="mb-2 text-[0.82rem] text-red-500">{saveError}</p>
      )}

      {/* Main textarea */}
      <Editor value={content} onChange={setContent} />

      {/* Image previews */}
      <ImageUploader ref={uploaderRef} files={images} onChange={setImages} />

      {/* AI prompt card (hidden until triggered) */}
      <AssistantPromptCard isOpen={isPromptOpen} content={content} />

      {/* Deep memo */}
      <label className="mb-3 block">
        <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">深掘りメモ</span>
        <textarea
          value={deepMemo}
          onChange={e => setDeepMemo(e.target.value)}
          rows={4}
          placeholder="気づいたことを追加記録"
          className="w-full resize-none rounded-[13px] border border-[#e8d5c6] bg-gradient-to-b from-white to-[#fffaf4] px-3 py-2.5 font-sans text-[0.94rem] text-ink outline-none transition focus:border-[#eca37d] focus:shadow-[0_0_0_4px_rgba(234,107,61,0.15)]"
        />
      </label>

      {/* Action chips */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            label: '写真を撮る',
            onClick: () => uploaderRef.current?.triggerCamera(),
          },
          {
            label: '画像アップロード',
            onClick: () => uploaderRef.current?.triggerUpload(),
          },
          {
            label: '音声入力',
            onClick: () => {},
          },
          {
            label: '質問をもらう',
            onClick: () => setIsPromptOpen(true),
          },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="rounded-[12px] border border-[#e9d9cc] bg-gradient-to-b from-white to-[#fff8f0] px-3 py-2 text-[0.8rem] text-ink transition hover:-translate-y-px"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
