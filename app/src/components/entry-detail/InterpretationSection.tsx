import Link from 'next/link'
import Skeleton from './Skeleton'
import type { EntryDetail } from '@/lib/entry'

type Props = { entry: EntryDetail }

function fmtDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ').replace(/-/g, '/')
}

export default function InterpretationSection({ entry }: Props) {
  return (
    <div className="mb-2 rounded-[18px] border border-[#e9d9cc] bg-white p-3 shadow-[0_10px_26px_rgba(70,42,18,0.09)]">
      <h3 className="mb-2 text-[0.92rem] font-extrabold text-ink">解釈</h3>

      {!entry.interpretation ? (
        <Skeleton rows={3} color="#e9d9cc" />
      ) : (
        <p className="mb-3 text-[0.84rem] leading-relaxed text-[#5d5048]">
          {entry.interpretation}
        </p>
      )}

      {entry.related_entries.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {entry.related_entries.map(rel => (
            <Link
              key={rel.id}
              href={`/entry/${rel.id}`}
              className="block w-full rounded-[12px] border border-[#e9d9cc] bg-gradient-to-r from-white to-[#f5fbff] px-3 py-2 text-left text-[0.8rem] text-[#2d5f79] transition-transform hover:-translate-y-px active:scale-95"
            >
              <span className="block text-[0.7rem] font-bold text-[#9b8f87]">
                関連エントリ {fmtDate(rel.created_at)}
              </span>
              <span className="mt-0.5 block line-clamp-1 text-[0.82rem]">
                {rel.summary ?? rel.content}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
