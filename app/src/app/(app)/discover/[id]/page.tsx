import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getDiscoverItem, getRelatedItems } from '@/lib/discover'
import ReasonBlock from '@/components/discover/ReasonBlock'
import AffiliateButton from '@/components/discover/AffiliateButton'
import ItemCard from '@/components/discover/ItemCard'
import { FIXTURE_DISCOVER_CATEGORIES } from '@/lib/mocks/discover-fixtures'

type Props = { params: Promise<{ id: string }> }

export default async function DiscoverDetailPage({ params }: Props) {
  const { id } = await params
  const item = await getDiscoverItem(id)
  if (!item) notFound()

  const related = getRelatedItems(item)
  const categoryMeta = FIXTURE_DISCOVER_CATEGORIES.find(c => c.key === item.category_key)

  return (
    <div className="flex flex-col pb-28">
      {/* Hero image */}
      <div className="relative h-52 w-full bg-[#f5ede4]">
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          sizes="100vw"
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Back button */}
        <Link
          href="/discover"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[0.85rem] font-bold text-ink"
        >
          ←
        </Link>
        {/* Category badge */}
        {categoryMeta && (
          <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.68rem] font-bold text-ink">
            {categoryMeta.emoji} {categoryMeta.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-4">
        <h1 className="text-[1rem] font-extrabold leading-snug text-ink">{item.title}</h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full bg-[#f5ede4] px-2.5 py-0.5 text-[0.68rem] font-bold text-[#9b6b47]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <p className="text-[0.82rem] leading-relaxed text-ink">{item.description}</p>

        <ReasonBlock reason={item.reason} />

        {item.affiliate_url && (
          <AffiliateButton url={item.affiliate_url} />
        )}
      </div>

      {/* Related items */}
      {related.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="px-4 text-[0.8rem] font-extrabold text-ink">同じカテゴリの他のおすすめ</h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {related.map(rel => (
              <ItemCard key={rel.id} item={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
