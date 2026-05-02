import Link from 'next/link'
import Skeleton from './Skeleton'
import type { EntryDetail } from '@/lib/entry'

type Props = { entry: EntryDetail }

export default function InsightSection({ entry }: Props) {
  const href = entry.chain_thread_id ? `/mentor/${entry.chain_thread_id}` : '/mentor'
  const pending = !entry.helpful_info

  return (
    <div className="mb-2 rounded-[18px] border border-[#bde4dd] bg-gradient-to-br from-[#ecfcf8] to-white p-3 shadow-[0_10px_26px_rgba(70,42,18,0.09)]">
      <h3 className="mb-2 text-[0.92rem] font-extrabold text-ink">気の利く情報</h3>

      {pending ? (
        <div className="mb-3">
          <Skeleton rows={2} color="#c6ede8" />
        </div>
      ) : (
        <p className="mb-3 text-[0.84rem] leading-relaxed text-[#5d5048]">
          {entry.helpful_info}
        </p>
      )}

      {pending ? (
        <button
          type="button"
          disabled
          className="block w-full cursor-not-allowed rounded-[12px] border border-[#df5d2f] bg-gradient-to-b from-[#ef7a4a] to-[#e56033] py-2 text-center text-[0.86rem] font-bold text-white opacity-40"
        >
          詳細
        </button>
      ) : (
        <Link
          href={href}
          className="block w-full rounded-[12px] border border-[#df5d2f] bg-gradient-to-b from-[#ef7a4a] to-[#e56033] py-2 text-center text-[0.86rem] font-bold text-white shadow-[0_8px_17px_rgba(221,95,50,0.27)] transition-transform hover:-translate-y-px active:scale-95"
        >
          詳細
        </Link>
      )}
    </div>
  )
}
