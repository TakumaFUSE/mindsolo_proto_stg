import Link from 'next/link'
import Image from 'next/image'
import type { CuratedDiscoverItem } from '@/lib/types'

type Props = { item: CuratedDiscoverItem }

export default function ItemCard({ item }: Props) {
  return (
    <Link
      href={`/discover/${item.id}`}
      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#ede3d8] bg-white"
    >
      <div className="relative h-24 w-full bg-[#f5ede4]">
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          sizes="144px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 py-2">
        <p className="line-clamp-2 text-[0.72rem] font-bold leading-snug text-ink">
          {item.title}
        </p>
        <p className="mt-auto line-clamp-1 text-[0.65rem] text-muted">
          {item.tags[0]}
        </p>
      </div>
    </Link>
  )
}
