import type { FeedGroup } from '@/lib/feed'
import EntryCard from './EntryCard'
import MentorThreadCard from './MentorThreadCard'
import ChainAddButton from './ChainAddButton'

type Props = { groups: FeedGroup[] }

export default function TimelineChain({ groups }: Props) {
  return (
    <section className="flex flex-col gap-8">
      {groups.map(group => (
        <div key={group.chainId} className="flex flex-col items-center">
          {group.items.map((item, i) => (
            <div key={item.id} className="flex w-full flex-col items-center">
              {i > 0 && (
                <div className="chain-connector h-3" aria-hidden="true" />
              )}
              <div className="w-full">
                {item.kind === 'entry' ? (
                  <EntryCard entry={item} />
                ) : (
                  <MentorThreadCard thread={item} />
                )}
              </div>
            </div>
          ))}
          {/* connector line to + button */}
          <div className="chain-connector-plain h-3" aria-hidden="true" />
          <ChainAddButton chainId={group.chainId} />
        </div>
      ))}
    </section>
  )
}
