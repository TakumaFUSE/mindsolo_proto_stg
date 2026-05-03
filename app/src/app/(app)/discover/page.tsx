import { getDiscoverTop } from '@/lib/discover'
import CategoryRail from '@/components/discover/CategoryRail'

export default async function DiscoverPage() {
  const categories = await getDiscoverTop()

  return (
    <div className="flex flex-col gap-6 py-4 pb-24">
      {/* Header */}
      <div className="px-4">
        <h1 className="text-[1.05rem] font-extrabold text-ink">発見する</h1>
        <p className="mt-0.5 text-[0.74rem] text-muted">あなたの内省から見えてきたもの</p>
      </div>

      {/* Recent interests chips — Phase 7 で AI 連携 */}
      <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {['内省', '創造性', '自然', '文化', '孤独と繋がり'].map(tag => (
          <span
            key={tag}
            className="shrink-0 rounded-full border border-[#d4956a] px-3 py-1 text-[0.72rem] font-bold text-[#d4956a]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Category rails */}
      <div className="flex flex-col gap-6">
        {categories.map(group => (
          <CategoryRail key={group.key} group={group} />
        ))}
      </div>
    </div>
  )
}
