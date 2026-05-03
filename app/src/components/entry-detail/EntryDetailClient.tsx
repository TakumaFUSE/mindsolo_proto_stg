'use client'

import { useEntryGeneration } from './useEntryGeneration'
import HeaderMeta from './HeaderMeta'
import ImageCarousel from './ImageCarousel'
import BodySection from './BodySection'
import InterpretationSection from './InterpretationSection'
import InsightSection from './InsightSection'
import type { EntryDetail } from '@/lib/entry'

type Props = { entry: EntryDetail }

export default function EntryDetailClient({ entry }: Props) {
  const alreadyGenerated = !!(entry.summary && entry.interpretation && entry.helpful_info)

  const gen = useEntryGeneration(
    entry.id,
    {
      summary: entry.summary,
      interpretation: entry.interpretation,
      related: entry.related_entries,
      insight: entry.helpful_info,
    },
    alreadyGenerated,
  )

  const liveEntry: EntryDetail = {
    ...entry,
    summary: gen.summary,
    interpretation: gen.interpretation,
    related_entries: gen.related,
    helpful_info: gen.insight,
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {gen.isStreaming && (
        <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-[#fff8f3] px-3 py-2 text-[0.74rem] text-[#9b5f41]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#d4956a]" />
          AIが解釈中です…
        </div>
      )}

      {gen.error && (
        <div className="mb-3 rounded-[10px] border border-[#f0d0c8] bg-[#fff4f2] px-3 py-2 text-[0.74rem] font-bold text-[#c0392b]">
          {gen.error}
        </div>
      )}

      <HeaderMeta entry={liveEntry} />
      <ImageCarousel imageUrls={entry.image_urls} />
      <BodySection entry={liveEntry} />
      <InterpretationSection entry={liveEntry} />
      <InsightSection entry={liveEntry} />
    </div>
  )
}
