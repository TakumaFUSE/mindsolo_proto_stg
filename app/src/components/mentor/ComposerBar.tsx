'use client'

import { useState, useRef } from 'react'

type Props = {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ComposerBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-[#ede3d8] bg-white px-3 py-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="メッセージを入力..."
        rows={1}
        className="flex-1 resize-none rounded-[12px] border border-[#e8d5c4] bg-[#fdf8f4] px-3 py-2 text-[0.82rem] text-ink placeholder-[#c4a882] outline-none focus:border-[#d4956a] disabled:opacity-50"
        style={{ maxHeight: '120px', overflow: 'auto' }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4956a] text-white transition active:scale-95 disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </div>
  )
}
