import { useEffect, useRef } from 'react'

type Props = { text: string }

export default function StreamingBubble({ text }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [text])

  return (
    <div className="flex justify-start">
      <div
        ref={ref}
        className="max-w-[80%] rounded-[16px] rounded-bl-[4px] border border-[#ede3d8] bg-white px-3 py-2 text-[0.82rem] leading-relaxed text-ink"
      >
        {text || <span className="text-muted">...</span>}
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[#d4956a]" />
      </div>
    </div>
  )
}
