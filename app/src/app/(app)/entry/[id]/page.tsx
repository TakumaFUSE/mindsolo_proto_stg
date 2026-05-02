import { notFound } from 'next/navigation'
import { FIXTURE_ENTRY_DETAILS } from '@/lib/mocks/entry-fixtures'
import { getEntryDetail } from '@/lib/entry'
import { createClient } from '@/lib/supabase/server'
import HeaderMeta from '@/components/entry-detail/HeaderMeta'
import ImageCarousel from '@/components/entry-detail/ImageCarousel'
import BodySection from '@/components/entry-detail/BodySection'
import InterpretationSection from '@/components/entry-detail/InterpretationSection'
import InsightSection from '@/components/entry-detail/InsightSection'
import type { EntryDetail } from '@/lib/entry'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let entry: EntryDetail | null = null

  if (DEV_BYPASS) {
    entry = FIXTURE_ENTRY_DETAILS.find(e => e.id === id) ?? null
    if (!entry) {
      const { devNewEntries } = await import('@/lib/dev-store')
      const found = devNewEntries.find(e => e.id === id)
      if (found && found.kind === 'entry') {
        entry = { ...found, related_entries: [], chain_thread_id: null }
      }
    }
  } else {
    const supabase = await createClient()
    entry = await getEntryDetail(supabase, id)
  }

  if (!entry) notFound()

  return (
    <div className="px-4 pt-4 pb-6">
      <HeaderMeta entry={entry} />
      <ImageCarousel imageUrls={entry.image_urls} />
      <BodySection entry={entry} />
      <InterpretationSection entry={entry} />
      <InsightSection entry={entry} />
    </div>
  )
}
