import Skeleton from './Skeleton'
import type { EntryDetail } from '@/lib/entry'

type Props = { entry: EntryDetail }

export default function BodySection({ entry }: Props) {
  return (
    <div className="mb-2 rounded-[18px] border border-[#e9d9cc] bg-white p-3 shadow-[0_10px_26px_rgba(70,42,18,0.09)]">
      <h3 className="mb-2 text-[0.92rem] font-extrabold text-ink">エントリの本文</h3>

      {!entry.summary ? (
        <div className="mb-3 rounded-[12px] border border-[#f0cfb8] bg-[#fff7ef] p-2">
          <div className="mb-2 h-2.5 w-14 animate-pulse rounded bg-[#f0cfb8]" />
          <Skeleton rows={1} color="#e9d9cc" />
        </div>
      ) : (
        <div className="mb-3 rounded-[12px] border border-[#f0cfb8] bg-[#fff7ef] p-2">
          <p className="mb-1 text-[0.74rem] font-extrabold text-[#9b5f41]">AIサマリ</p>
          <p className="text-[0.84rem] leading-relaxed text-[#5d5048]">{entry.summary}</p>
        </div>
      )}

      <p className="text-[0.84rem] leading-relaxed text-[#5d5048]">{entry.content}</p>
    </div>
  )
}
