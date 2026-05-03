import Link from 'next/link'
import type { MentorThreadView } from '@/lib/types'

type Props = { thread: MentorThreadView }

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ThreadCard({ thread }: Props) {
  return (
    <Link
      href={`/mentor/${thread.id}`}
      className="flex items-start gap-3 rounded-[16px] border border-[#ede3d8] bg-white p-3 transition active:bg-[#fdf6ef]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5d5b8] text-[0.9rem] font-extrabold text-[#9b5f41]">
        {thread.mentor_avatar}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[0.82rem] font-extrabold text-ink">{thread.mentor_name}</p>
          <time className="shrink-0 text-[0.68rem] text-muted">{formatDate(thread.updated_at)}</time>
        </div>
        {thread.title && (
          <p className="mt-0.5 truncate text-[0.76rem] font-semibold text-[#7a5c48]">
            {thread.title}
          </p>
        )}
        {thread.last_message && (
          <p className="mt-0.5 truncate text-[0.74rem] leading-snug text-muted">
            {thread.last_message}
          </p>
        )}
      </div>
    </Link>
  )
}
