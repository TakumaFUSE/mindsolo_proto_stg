import { getDiscoverTop } from '@/lib/discover'
import CategoryRail from '@/components/discover/CategoryRail'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

async function getUserTopics(): Promise<string[]> {
  if (DEV_BYPASS) {
    const { FIXTURE_ENTRY_DETAILS } = await import('@/lib/mocks/entry-fixtures')
    const { devNewEntries } = await import('@/lib/dev-store')
    const allTopics = [
      ...FIXTURE_ENTRY_DETAILS.flatMap(e => e.topics ?? []),
      ...devNewEntries.flatMap(e => (e.kind === 'entry' ? e.topics ?? [] : [])),
    ]
    return Array.from(new Set(allTopics)).slice(0, 8)
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('entries')
    .select('topics')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .limit(20)

  return Array.from(new Set((data ?? []).flatMap(e => e.topics ?? []))).slice(0, 8)
}

export default async function DiscoverPage() {
  const [categories, userTopics] = await Promise.all([getDiscoverTop(), getUserTopics()])

  return (
    <div className="flex flex-col gap-6 py-4 pb-24">
      {/* Header */}
      <div className="px-4">
        <h1 className="text-[1.05rem] font-extrabold text-ink">発見する</h1>
        <p className="mt-0.5 text-[0.74rem] text-muted">あなたの内省から見えてきたもの</p>
      </div>

      {/* Recent interests chips — derived from user entry topics */}
      {userTopics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {userTopics.map(tag => (
            <span
              key={tag}
              className="shrink-0 rounded-full border border-[#d4956a] px-3 py-1 text-[0.72rem] font-bold text-[#d4956a]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Category rails */}
      <div className="flex flex-col gap-6">
        {categories.map(group => (
          <CategoryRail key={group.key} group={group} />
        ))}
      </div>
    </div>
  )
}
