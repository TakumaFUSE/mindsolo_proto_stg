import type { EntryDetail } from '@/lib/entry'

function fmtDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ').replace(/-/g, '/')
}

type Props = { entry: EntryDetail }

export default function HeaderMeta({ entry }: Props) {
  const tag = entry.tags[0]
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="rounded-full border border-[#f0c5a7] bg-[#fff3e6] px-3 py-1 text-[0.74rem] text-[#9a5e40]">
        {fmtDate(entry.created_at)}
      </span>
      {tag && (
        <span className="rounded-full border border-[#f0cab2] bg-[#fff4ea] px-2 py-0.5 text-[0.7rem] text-[#9a5e40]">
          {tag}
        </span>
      )}
    </div>
  )
}
