'use client'
import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
}

export default function Editor({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
        今日の出来事・感情
      </span>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={6}
        placeholder="何が起きて、何を感じましたか？"
        className="w-full resize-none rounded-[13px] border border-[#e8d5c6] bg-gradient-to-b from-white to-[#fffaf4] px-3 py-2.5 font-sans text-[0.94rem] text-ink outline-none transition focus:border-[#eca37d] focus:shadow-[0_0_0_4px_rgba(234,107,61,0.15)]"
      />
    </label>
  )
}
