import Link from 'next/link'
import type { MentorThread } from '@/lib/types'

type Props = { thread: MentorThread & { mentor_name: string } }

function fmt(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MentorThreadCard({ thread }: Props) {
  return (
    <Link
      href={`/mentor/${thread.id}`}
      className="block w-full rounded-[18px] border border-dashed border-[#b5e6dd] bg-gradient-to-br from-[#f1fdfb] to-white p-3 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-px active:scale-[0.98]"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[0.84rem] font-extrabold text-ink">
          メンタースレッド {fmt(thread.created_at)}
        </p>
        <span className="shrink-0 rounded-full border border-[#b8e6dc] bg-[#eafcf8] px-2 py-0.5 text-[0.7rem] text-[#117f76]">
          {thread.mentor_name}
        </span>
      </div>
      {thread.title && (
        <span className="line-clamp-2 block text-[0.82rem] leading-relaxed text-[#5f5249]">
          {thread.title}
        </span>
      )}
    </Link>
  )
}
