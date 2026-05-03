import type { DiscoverCategoryGroup } from '@/lib/types'
import ItemCard from '@/components/discover/ItemCard'

type Props = { group: DiscoverCategoryGroup }

export default function CategoryRail({ group }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-4">
        <span className="text-[1rem]">{group.emoji}</span>
        <h2 className="text-[0.82rem] font-extrabold text-ink">{group.label}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {group.items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
