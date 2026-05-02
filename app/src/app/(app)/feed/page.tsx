import { FIXTURE_FEED_ITEMS, FIXTURE_SUGGESTIONS } from '@/lib/mocks/feed-fixtures'
import { groupFeedItems, getFeedItems } from '@/lib/feed'
import SearchBar from '@/components/feed/SearchBar'
import SuggestionRail from '@/components/feed/SuggestionRail'
import TimelineChain from '@/components/feed/TimelineChain'
import { createClient } from '@/lib/supabase/server'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function FeedPage() {
  let groups: import('@/lib/feed').FeedGroup[]
  let suggestions: import('@/lib/types').ReflectionSuggestion[]
  let displayName: string

  if (DEV_BYPASS) {
    groups = groupFeedItems(FIXTURE_FEED_ITEMS)
    suggestions = FIXTURE_SUGGESTIONS
    displayName = 'Hiroki'
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      groups = []
      suggestions = []
      displayName = 'ゲスト'
    } else {
      const result = await getFeedItems(supabase, user.id)
      groups = result.groups
      suggestions = result.suggestions

      const profileRes = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      displayName = profileRes.data?.display_name ?? 'ゲスト'
    }
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Welcome */}
      <div className="mb-3 rounded-[18px] border border-[#f0caaf] bg-gradient-to-br from-[#ffe9da] via-[#fff5ea] to-white p-3">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-widest text-[#a16142]">
          Daily Reflection
        </p>
        <h2 className="mt-1 text-[1.1rem] font-extrabold leading-snug text-ink">
          おかえりなさい、{displayName}さん
        </h2>
      </div>

      {/* Search / filter */}
      <SearchBar />

      {/* Reflection suggestions */}
      <SuggestionRail suggestions={suggestions} />

      {/* Chain timeline */}
      <div className="mb-3 flex items-center">
        <h3 className="text-[0.95rem] font-extrabold text-ink">最近のエントリ</h3>
      </div>
      <TimelineChain groups={groups} />
    </div>
  )
}
