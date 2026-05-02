import Link from 'next/link'
import type { Entry } from '@/lib/types'

type Props = { entry: Entry }

function fmt(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EntryCard({ entry }: Props) {
  const tag = entry.tags[0]
  const text = entry.summary ?? entry.content

  return (
    <Link
      href={`/entry/${entry.id}`}
      className="block w-full rounded-[18px] border border-[#e9d9cc] bg-white p-3 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-px active:scale-[0.98]"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[0.84rem] font-extrabold text-ink">
          エントリ {fmt(entry.created_at)}
        </p>
        {tag && (
          <span className="shrink-0 rounded-full border border-[#f0cab2] bg-[#fff4ea] px-2 py-0.5 text-[0.7rem] text-[#9a5e40]">
            {tag}
          </span>
        )}
      </div>
      <span className="line-clamp-2 block text-[0.82rem] leading-relaxed text-[#5f5249]">
        {text}
      </span>
    </Link>
  )
}
